import { loadPrompt, textJson } from "../ai/openai.js";
import { getArtifact, saveArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

export async function caption(campaign: Campaign) {
  const content = await getArtifact<any>(campaign.id, "content", "approved");
  if (!content) throw new Error("Content missing");
  const prompt = await loadPrompt("prompts/caption.md");
  const result = await textJson(prompt, JSON.stringify({
    story_title: content.story_title,
    editorial_angle: content.editorial_angle,
    fact_ledger: content.fact_ledger,
    forbidden_claims: content.forbidden_claims,
    carousel: content.carousel
  }, null, 2));
  const data = result.data;
  await saveArtifact(campaign.id, "caption", "approved", data, sha256(stableJson(data)));
  return data;
}
