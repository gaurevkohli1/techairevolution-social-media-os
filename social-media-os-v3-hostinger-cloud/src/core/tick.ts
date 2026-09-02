import { DateTime } from "luxon";
import { config } from "../config.js";
import { withNamedLock } from "../db.js";
import { ensureTodayCampaign, setStatus, failCampaign } from "./campaign.js";
import { discover } from "../workflows/discover.js";
import { editorial } from "../workflows/editorial.js";
import { creative } from "../workflows/creative.js";
import { submitMissingGenerations, pollGenerations, allGenerationsComplete } from "../workflows/generation.js";
import { compose } from "../workflows/compose.js";
import { visualQa } from "../workflows/visualQa.js";
import { caption } from "../workflows/caption.js";
import { bind } from "../workflows/bind.js";
import { publishInstagram, publishFacebook } from "../publish/meta.js";
import { logger } from "../logger.js";

export async function tick() {
  return withNamedLock("social-media-os-v3-tick", async () => {
    if (!config.AUTOPILOT_ENABLED) {
      return { ok: true, action: "AUTOPILOT_DISABLED" };
    }

    const campaign = await ensureTodayCampaign();
    if (!campaign) return { ok: true, action: "NOT_DUE" };

    try {
      switch (campaign.status) {
        case "DISCOVER":
          await discover(campaign);
          await setStatus(campaign.id, "EDITORIAL");
          return { ok:true, action:"DISCOVERED", campaign:campaign.campaign_key };

        case "EDITORIAL":
          const content = await editorial(campaign);
          await setStatus(campaign.id, "CREATIVE", { story_title: content.story_title });
          return { ok:true, action:"EDITORIAL_READY" };

        case "CREATIVE":
          await creative(campaign);
          await setStatus(campaign.id, "GENERATE");
          return { ok:true, action:"CREATIVE_READY" };

        case "GENERATE": {
          const r = await submitMissingGenerations(campaign);
          if (!r.submitted) await setStatus(campaign.id, "GENERATE_WAIT");
          return { ok:true, action:r.submitted ? "GENERATION_SUBMITTED" : "ALL_SUBMITTED" };
        }

        case "GENERATE_WAIT": {
          if (await allGenerationsComplete(campaign)) {
            await setStatus(campaign.id, "COMPOSE");
            return { ok:true, action:"GENERATION_COMPLETE" };
          }
          await pollGenerations(campaign);
          return { ok:true, action:"GENERATION_POLLED" };
        }

        case "COMPOSE":
          await compose(campaign);
          await setStatus(campaign.id, "VISUAL_QA");
          return { ok:true, action:"COMPOSED" };

        case "VISUAL_QA": {
          const qa = await visualQa(campaign);
          if (qa.status === "APPROVED") {
            await setStatus(campaign.id, "CAPTION");
            return { ok:true, action:"VISUAL_APPROVED", score:qa.data.overall_score };
          }
          // Foundation behavior: withhold rather than publish a weak carousel.
          // Automatic targeted repair is the next implementation increment.
          await setStatus(campaign.id, "WITHHELD", { reason:"VISUAL_QA_REJECTED", score:qa.data.overall_score });
          return { ok:true, action:"WITHHELD_FOR_QUALITY", score:qa.data.overall_score };
        }

        case "CAPTION":
          await caption(campaign);
          await setStatus(campaign.id, "BIND");
          return { ok:true, action:"CAPTION_READY" };

        case "BIND":
          await bind(campaign);
          await setStatus(campaign.id, "WAIT_PUBLISH");
          return { ok:true, action:"BOUND" };

        case "WAIT_PUBLISH": {
          const due = campaign.target_publish_at_utc
            ? DateTime.fromSQL(String(campaign.target_publish_at_utc), { zone:"utc" })
            : null;
          if (!due || DateTime.utc() < due) return { ok:true, action:"WAITING_FOR_TARGET_TIME" };
          if (!config.META_WRITE_ENABLED) return { ok:true, action:"META_WRITE_DISABLED_READY" };
          await setStatus(campaign.id, "PUBLISH_IG");
          return { ok:true, action:"PUBLISH_WINDOW_OPEN" };
        }

        case "PUBLISH_IG":
          await publishInstagram(campaign);
          await setStatus(campaign.id, "PUBLISH_FB");
          return { ok:true, action:"INSTAGRAM_PUBLISHED" };

        case "PUBLISH_FB":
          await publishFacebook(campaign);
          await setStatus(campaign.id, "PUBLISHED");
          return { ok:true, action:"FACEBOOK_PUBLISHED" };

        case "PUBLISHED":
        case "WITHHELD":
        case "FAILED":
        case "RESULT_UNKNOWN":
          return { ok:true, action:`TERMINAL_${campaign.status}` };
      }
    } catch (err:any) {
      logger.error({ err, campaign: campaign.campaign_key }, "tick stage failed");
      // RESULT_UNKNOWN is written inside the external-write guard and must stay terminal.
      if (campaign.status !== "RESULT_UNKNOWN") {
        await failCampaign(campaign.id, "STAGE_FAILURE", err?.stack || err?.message || String(err));
      }
      throw err;
    }
  });
}
