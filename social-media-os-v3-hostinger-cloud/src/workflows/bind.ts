import { getArtifactRow, saveArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

export async function bind(campaign: Campaign) {
  const content = await getArtifactRow(campaign.id, "content", "approved");
  const creative = await getArtifactRow(campaign.id, "creative", "plan");
  const finals = await getArtifactRow(campaign.id, "final", "slides");
  const caption = await getArtifactRow(campaign.id, "caption", "approved");
  if (!content || !creative || !finals || !caption) throw new Error("Binding inputs missing");

  const binding = {
    schema_version: "3.0",
    campaign_key: campaign.campaign_key,
    content_sha256: content.sha256,
    creative_sha256: creative.sha256,
    final_slides_sha256: finals.sha256,
    caption_sha256: caption.sha256,
    bound_at: new Date().toISOString()
  };
  const digest = sha256(stableJson(binding));
  await saveArtifact(campaign.id, "binding", "campaign", { ...binding, digest }, digest);
  return { ...binding, digest };
}
