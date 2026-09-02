import { loadPrompt, webJson } from "../ai/openai.js";
import { saveArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

export async function discover(campaign: Campaign) {
  const prompt = await loadPrompt("prompts/discovery.md");
  const result = await webJson(prompt, `
Today is ${campaign.local_date} in the TechAIrevolution publishing timezone.
Find and rank fresh stories for today's @techairevolution carousel.
Return at least 5 candidates when evidence allows.
`);
  const data = result.data;
  await saveArtifact(campaign.id, "discovery", "ranked", data, sha256(stableJson(data)));
  return data;
}
