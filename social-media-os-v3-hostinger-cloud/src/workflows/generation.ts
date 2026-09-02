import { db } from "../db.js";
import { submitImage, getImageStatus, getImageResult } from "../ai/fal.js";
import { getArtifact } from "../core/artifacts.js";
import { sha256 } from "../core/hash.js";
import type { Campaign } from "../types.js";

const COVER_VARIANTS = 4;
const BODY_VARIANTS = 2;

export async function submitMissingGenerations(campaign: Campaign) {
  const plan = await getArtifact<any>(campaign.id, "creative", "plan");
  if (!plan) throw new Error("Creative plan missing");

  for (const slide of plan.slides) {
    const slideNo = Number(slide.slide);
    const count = slideNo === 1 ? COVER_VARIANTS : BODY_VARIANTS;
    for (let variant = 1; variant <= count; variant++) {
      const [rows] = await db.query<any[]>(
        "SELECT id FROM generation_jobs WHERE campaign_id=? AND slide_no=? AND variant_no=? LIMIT 1",
        [campaign.id, slideNo, variant]
      );
      if (rows.length) continue;
      const prompt = `${slide.art_prompt}\n\nVariant ${variant}. Artwork only. No readable headline, logo or watermark. Reserve intentional typography-safe negative space.`;
      const requestId = await submitImage(prompt);
      await db.execute(
        `INSERT INTO generation_jobs(campaign_id,slide_no,variant_no,provider,model,provider_request_id,status,prompt)
         VALUES(?,?,?,'fal.ai',?,?, 'SUBMITTED', ?)`,
        [campaign.id, slideNo, variant, process.env.FAL_IMAGE_MODEL || "openai/gpt-image-2", requestId, prompt]
      );
      // one external generation submission per controller tick keeps Hostinger runtime short/resumable
      return { submitted: true };
    }
  }
  return { submitted: false };
}

export async function pollGenerations(campaign: Campaign) {
  const [rows] = await db.query<any[]>(
    `SELECT * FROM generation_jobs
     WHERE campaign_id=? AND status IN ('SUBMITTED','IN_PROGRESS')
     ORDER BY slide_no,variant_no LIMIT 1`,
    [campaign.id]
  );
  if (!rows.length) return { pending: false };
  const job = rows[0];
  const status: any = await getImageStatus(job.provider_request_id);

  if (status?.status === "COMPLETED") {
    const result = await getImageResult(job.provider_request_id);
    await db.execute(
      `UPDATE generation_jobs SET status='COMPLETED', result_url=?, result_sha256=? WHERE id=?`,
      [result.url, sha256(result.url), job.id]
    );
  } else if (status?.status === "FAILED") {
    await db.execute("UPDATE generation_jobs SET status='FAILED', error_detail=? WHERE id=?", [JSON.stringify(status), job.id]);
    throw new Error(`fal generation failed for slide ${job.slide_no} variant ${job.variant_no}`);
  } else {
    await db.execute("UPDATE generation_jobs SET status='IN_PROGRESS' WHERE id=?", [job.id]);
  }

  return { pending: true };
}

export async function allGenerationsComplete(campaign: Campaign) {
  const [rows] = await db.query<any[]>(
    `SELECT
       SUM(status='COMPLETED') AS done_count,
       COUNT(*) AS total_count
     FROM generation_jobs WHERE campaign_id=?`,
    [campaign.id]
  );
  return Number(rows[0]?.total_count || 0) > 0 &&
         Number(rows[0]?.done_count || 0) === Number(rows[0]?.total_count || 0);
}
