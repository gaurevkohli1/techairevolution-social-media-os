import { loadPrompt, visionJson } from "../ai/openai.js";
import { getArtifact } from "../core/artifacts.js";
import { db } from "../db.js";
import { config } from "../config.js";
import type { Campaign } from "../types.js";

export async function visualQa(campaign: Campaign) {
  const finalSlides = await getArtifact<any[]>(campaign.id, "final", "slides");
  const content = await getArtifact<any>(campaign.id, "content", "approved");
  const creative = await getArtifact<any>(campaign.id, "creative", "plan");
  if (!finalSlides || !content || !creative) throw new Error("Visual QA inputs missing");
  const prompt = await loadPrompt("prompts/visual-qa.md");

  const result = await visionJson(prompt, JSON.stringify({
    story: content.story_title,
    creative_direction: creative.selected_direction,
    campaign_system: creative.campaign_system,
    required_minimum: config.CREATIVE_SCORE_MINIMUM
  }, null, 2), finalSlides.map(x => x.url));

  const data = result.data;
  const overall = Number(data.overall_score || 0);
  const status = overall >= config.CREATIVE_SCORE_MINIMUM ? "APPROVED" : "REJECTED";
  await db.execute(
    "INSERT INTO qa_results(campaign_id,qa_type,status,score,result_json) VALUES(?,?,?,?,?)",
    [campaign.id, "VISUAL_FINAL", status, overall, JSON.stringify(data)]
  );
  return { status, data };
}
