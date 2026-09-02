import { db } from "../db.js";

export async function saveArtifact(
  campaignId: number,
  type: string,
  key: string,
  value: unknown,
  sha256?: string,
  externalUrl?: string
) {
  const payload = typeof value === "string" ? null : JSON.stringify(value);
  const text = typeof value === "string" ? value : null;
  await db.execute(
    `INSERT INTO artifacts
      (campaign_id, artifact_type, artifact_key, payload_json, text_payload, external_url, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      payload_json=VALUES(payload_json),
      text_payload=VALUES(text_payload),
      external_url=VALUES(external_url),
      sha256=VALUES(sha256),
      updated_at=CURRENT_TIMESTAMP`,
    [campaignId, type, key, payload, text, externalUrl ?? null, sha256 ?? null]
  );
}

export async function getArtifact<T = any>(campaignId: number, type: string, key: string): Promise<T | null> {
  const [rows] = await db.query<any[]>(
    `SELECT payload_json, text_payload, external_url, sha256
     FROM artifacts WHERE campaign_id=? AND artifact_type=? AND artifact_key=? LIMIT 1`,
    [campaignId, type, key]
  );
  const row = rows[0];
  if (!row) return null;
  const value = row.payload_json ?? row.text_payload;
  if (value && typeof value === "string" && row.payload_json) {
    try { return JSON.parse(value); } catch {}
  }
  return value as T;
}

export async function getArtifactRow(campaignId: number, type: string, key: string) {
  const [rows] = await db.query<any[]>(
    `SELECT * FROM artifacts WHERE campaign_id=? AND artifact_type=? AND artifact_key=? LIMIT 1`,
    [campaignId, type, key]
  );
  return rows[0] ?? null;
}
