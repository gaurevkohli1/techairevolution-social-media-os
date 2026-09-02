import fs from "node:fs/promises";
import OpenAI from "openai";
import { config } from "../config.js";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

function parseJson(text: string): any {
  const cleaned = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

export async function webJson(systemPrompt: string, input: string): Promise<any> {
  const response = await client.responses.create({
    model: config.OPENAI_REASONING_MODEL,
    instructions: systemPrompt,
    tools: [{ type: "web_search_preview" }],
    include: ["web_search_call.action.sources"],
    input
  } as any);
  return {
    data: parseJson(response.output_text),
    requestId: (response as any)._request_id ?? null,
    rawModel: response.model
  };
}

export async function textJson(systemPrompt: string, input: string): Promise<any> {
  const response = await client.responses.create({
    model: config.OPENAI_REASONING_MODEL,
    instructions: systemPrompt,
    input
  });
  return {
    data: parseJson(response.output_text),
    requestId: (response as any)._request_id ?? null,
    rawModel: response.model
  };
}

export async function visionJson(systemPrompt: string, input: string, imageUrls: string[]): Promise<any> {
  const content: any[] = [{ type: "input_text", text: input }];
  for (const image_url of imageUrls) content.push({ type: "input_image", image_url });
  const response = await client.responses.create({
    model: config.OPENAI_VISION_MODEL,
    instructions: systemPrompt,
    input: [{ role: "user", content }]
  } as any);
  return {
    data: parseJson(response.output_text),
    requestId: (response as any)._request_id ?? null,
    rawModel: response.model
  };
}

export async function loadPrompt(path: string) {
  return fs.readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}
