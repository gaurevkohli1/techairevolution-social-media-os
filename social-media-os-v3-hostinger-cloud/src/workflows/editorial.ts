import { loadPrompt, webJson } from "../ai/openai.js";
import { getArtifact, saveArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

export async function editorial(campaign: Campaign) {
  const discovery = await getArtifact<any>(campaign.id, "discovery", "ranked");
  if (!discovery) throw new Error("Discovery artifact missing");
  const winner = discovery.candidates?.[discovery.winner_index ?? 0];
  if (!winner) throw new Error("Discovery winner missing");

  const prompt = await loadPrompt("prompts/editorial.md");
  const result = await webJson(prompt, JSON.stringify({ selected_story: winner }, null, 2));
  const data = result.data;
  if (!Array.isArray(data?.carousel?.slides) || data.carousel.slides.length !== 6) {
    throw new Error("Editorial package must contain exactly six carousel slides");
  }
  await saveArtifact(campaign.id, "content", "approved", data, sha256(stableJson(data)));
  return data;
}
