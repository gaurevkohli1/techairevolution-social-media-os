import fs from "node:fs/promises";
import { loadPrompt, textJson } from "../ai/openai.js";
import { getArtifact, saveArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

export async function creative(campaign: Campaign) {
  const content = await getArtifact<any>(campaign.id, "content", "approved");
  if (!content) throw new Error("Approved content missing");
  const dna = JSON.parse(await fs.readFile(new URL("../../brand/creative-dna.json", import.meta.url), "utf8"));
  const prompt = await loadPrompt("prompts/creative.md");
  const result = await textJson(prompt, JSON.stringify({
    approved_content: content,
    brand_dna: dna
  }, null, 2));
  const data = result.data;
  if (!Array.isArray(data?.candidates) || data.candidates.length !== 5) throw new Error("Creative director must return 5 candidates");
  if (!Array.isArray(data?.slides) || data.slides.length !== 6) throw new Error("Creative plan must contain 6 slides");
  await saveArtifact(campaign.id, "creative", "plan", data, sha256(stableJson(data)));
  return data;
}
