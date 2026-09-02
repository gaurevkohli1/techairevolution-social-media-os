import { config } from "../config.js";
import { db } from "../db.js";
import { markResultUnknown } from "../core/campaign.js";
import { getArtifact } from "../core/artifacts.js";
import { sha256, stableJson } from "../core/hash.js";
import type { Campaign } from "../types.js";

const BASE = `https://graph.facebook.com/${config.META_API_VERSION}`;

async function graphRead(path: string, params: Record<string,string>) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  url.searchParams.set("access_token", config.META_USER_ACCESS_TOKEN || "");
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`Meta read failed ${res.status}: ${text.slice(0,1000)}`);
  return JSON.parse(text);
}

async function graphWrite(campaign: Campaign, platform: string, path: string, body: Record<string,any>) {
  if (!config.META_WRITE_ENABLED) throw new Error("META_WRITE_ENABLED is false");
  const form = new URLSearchParams();
  for (const [k,v] of Object.entries(body)) {
    form.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  form.set("access_token", config.META_USER_ACCESS_TOKEN || "");

  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: {"content-type":"application/x-www-form-urlencoded"},
      body: form,
      signal: AbortSignal.timeout(45000)
    });
  } catch (err:any) {
    await markResultUnknown(campaign.id, platform, `Transport ambiguity on ${path}: ${err?.message || err}`);
    throw err;
  }

  const text = await res.text();
  // Any gateway/server response after a POST is treated conservatively as potentially ambiguous.
  if (res.status >= 500) {
    await markResultUnknown(campaign.id, platform, `Meta ${res.status} after write ${path}: ${text.slice(0,2000)}`);
    throw new Error(`Ambiguous Meta write (${res.status}); blind retry blocked`);
  }
  if (!res.ok) throw new Error(`Meta write failed ${res.status}: ${text.slice(0,2000)}`);
  return JSON.parse(text);
}

async function existingReceipt(campaignId:number, platform:string) {
  const [rows] = await db.query<any[]>(
    "SELECT * FROM publish_receipts WHERE campaign_id=? AND platform=? AND status='PUBLISHED' LIMIT 1",
    [campaignId, platform]
  );
  return rows[0] ?? null;
}

async function saveReceipt(campaignId:number, platform:string, externalId:string, permalink:string|null, raw:any, fingerprint:string) {
  await db.execute(
    `INSERT INTO publish_receipts(campaign_id,platform,status,external_id,permalink,request_fingerprint,receipt_json,published_at)
     VALUES(?,?,'PUBLISHED',?,?,?,?,UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
      status='PUBLISHED', external_id=VALUES(external_id), permalink=VALUES(permalink),
      receipt_json=VALUES(receipt_json), published_at=VALUES(published_at)`,
    [campaignId,platform,externalId,permalink,fingerprint,JSON.stringify(raw)]
  );
}

export async function publishInstagram(campaign: Campaign) {
  if (await existingReceipt(campaign.id, "instagram")) return { skipped: true };
  if (!config.META_IG_USER_ID) throw new Error("META_IG_USER_ID missing");
  const slides = await getArtifact<any[]>(campaign.id, "final", "slides");
  const caption = await getArtifact<any>(campaign.id, "caption", "approved");
  if (!slides || slides.length !== 6 || !caption?.publish_caption) throw new Error("Instagram publication inputs missing");

  const fingerprint = sha256(stableJson({slides,caption:caption.publish_caption}));
  const childIds:string[] = [];
  for (const slide of slides) {
    const child = await graphWrite(campaign, "INSTAGRAM", `${config.META_IG_USER_ID}/media`, {
      image_url: slide.url,
      is_carousel_item: "true"
    });
    childIds.push(child.id);
  }

  const parent = await graphWrite(campaign, "INSTAGRAM", `${config.META_IG_USER_ID}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: caption.publish_caption
  });

  // Read-only readiness checks may safely repeat.
  for (let i=0;i<12;i++) {
    const status = await graphRead(parent.id, { fields: "status_code" });
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Instagram container status ${status.status_code}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  const published = await graphWrite(campaign, "INSTAGRAM", `${config.META_IG_USER_ID}/media_publish`, {
    creation_id: parent.id
  });
  const media = await graphRead(published.id, { fields: "id,permalink" });
  await saveReceipt(campaign.id, "instagram", published.id, media.permalink || null, {parent, published, media}, fingerprint);
  return media;
}

export async function publishFacebook(campaign: Campaign) {
  if (await existingReceipt(campaign.id, "facebook")) return { skipped: true };
  if (!config.META_FB_PAGE_ID) throw new Error("META_FB_PAGE_ID missing");
  const slides = await getArtifact<any[]>(campaign.id, "final", "slides");
  const caption = await getArtifact<any>(campaign.id, "caption", "approved");
  if (!slides || slides.length !== 6 || !caption?.publish_caption) throw new Error("Facebook publication inputs missing");

  const fingerprint = sha256(stableJson({slides,caption:caption.publish_caption}));
  const photoIds:string[] = [];
  for (const slide of slides) {
    const photo = await graphWrite(campaign, "FACEBOOK", `${config.META_FB_PAGE_ID}/photos`, {
      url: slide.url,
      published: "false"
    });
    photoIds.push(photo.id);
  }

  const attached_media = photoIds.map(media_fbid => ({ media_fbid }));
  const post = await graphWrite(campaign, "FACEBOOK", `${config.META_FB_PAGE_ID}/feed`, {
    message: caption.publish_caption,
    attached_media
  });

  await saveReceipt(campaign.id, "facebook", post.id, null, post, fingerprint);
  return post;
}
