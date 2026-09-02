import { fal } from "@fal-ai/client";
import { config } from "../config.js";

fal.config({ credentials: config.FAL_KEY });

export async function submitImage(prompt: string) {
  const result: any = await fal.queue.submit(config.FAL_IMAGE_MODEL, {
    input: {
      prompt,
      image_size: { width: 1024, height: 1280 },
      quality: "high",
      num_images: 1,
      output_format: "png"
    }
  });
  return result.request_id as string;
}

export async function getImageStatus(requestId: string) {
  return fal.queue.status(config.FAL_IMAGE_MODEL, { requestId, logs: false }) as any;
}

export async function getImageResult(requestId: string) {
  const result: any = await fal.queue.result(config.FAL_IMAGE_MODEL, { requestId });
  const url = result?.data?.images?.[0]?.url;
  if (!url) throw new Error("fal.ai result missing images[0].url");
  return { url, requestId: result.requestId ?? requestId, raw: result.data };
}
