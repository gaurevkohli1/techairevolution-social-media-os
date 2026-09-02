import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db } from "../db.js";
import { getArtifact, saveArtifact } from "../core/artifacts.js";
import { uploadAsset } from "../assets/cloudinary.js";
import { sha256 } from "../core/hash.js";
import type { Campaign } from "../types.js";

const W = 1024;
const H = 1280;

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] || c));
}

function splitHeadline(text: string, max = 22) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function typographySvg(headline: string, body: string, slideNo: number) {
  const lines = splitHeadline(headline);
  const tspans = lines.map((l,i) => `<tspan x="70" dy="${i===0?0:88}">${escapeXml(l)}</tspan>`).join("");
  const bodySafe = escapeXml(body.slice(0, 230));
  return `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .hero { font-family: "Arial Black", Arial, sans-serif; font-size: 76px; font-weight: 900; fill: #ffffff; letter-spacing: -2px; }
      .body { font-family: Arial, sans-serif; font-size: 27px; fill: #f2f2f2; }
      .meta { font-family: Arial, sans-serif; font-size: 19px; fill: #ffffff; letter-spacing: 1px; }
    </style>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fade)"/>
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#08080b" stop-opacity=".92"/>
        <stop offset="66%" stop-color="#08080b" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#08080b" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <text x="70" y="95" class="meta">TECHAI REVOLUTION</text>
    <text x="70" y="250" class="hero">${tspans}</text>
    <foreignObject x="70" y="650" width="560" height="250">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:27px;line-height:1.35;color:#f2f2f2;">${bodySafe}</div>
    </foreignObject>
    <text x="70" y="1210" class="meta">@techairevolution</text>
    <text x="870" y="1210" class="meta">${String(slideNo).padStart(2,"0")} / 06</text>
  </svg>`;
}

export async function compose(campaign: Campaign) {
  const content = await getArtifact<any>(campaign.id, "content", "approved");
  if (!content) throw new Error("Content missing");

  const [rows] = await db.query<any[]>(
    `SELECT g.* FROM generation_jobs g
     INNER JOIN (
       SELECT slide_no, MIN(variant_no) variant_no
       FROM generation_jobs
       WHERE campaign_id=? AND status='COMPLETED'
       GROUP BY slide_no
     ) x ON x.slide_no=g.slide_no AND x.variant_no=g.variant_no
     WHERE g.campaign_id=?
     ORDER BY g.slide_no`,
    [campaign.id, campaign.id]
  );
  if (rows.length !== 6) throw new Error("Need six completed slide candidates before composition");

  const outputs = [];
  for (const row of rows) {
    const slide = content.carousel.slides.find((s:any) => Number(s.slide) === Number(row.slide_no));
    const response = await fetch(row.result_url);
    if (!response.ok) throw new Error(`Failed to download generated art: ${response.status}`);
    const art = Buffer.from(await response.arrayBuffer());

    const final = await sharp(art)
      .resize(W,H,{fit:"cover"})
      .composite([{ input: Buffer.from(typographySvg(slide.headline, slide.supporting_copy, row.slide_no)) }])
      .png()
      .toBuffer();

    const tmp = path.join(os.tmpdir(), `${campaign.campaign_key}-slide-${row.slide_no}.png`);
    await fs.writeFile(tmp, final);
    const cloud = await uploadAsset(tmp, `social-media-os/${campaign.campaign_key}/slide-${String(row.slide_no).padStart(2,"0")}`);
    outputs.push({ slide: row.slide_no, url: cloud.url, sha256: sha256(final), width: W, height: H });
    await fs.unlink(tmp).catch(()=>{});
  }

  await saveArtifact(campaign.id, "final", "slides", outputs, sha256(JSON.stringify(outputs)));
  return outputs;
}
