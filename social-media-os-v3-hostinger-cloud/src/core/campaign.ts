import { DateTime } from "luxon";
import { config } from "../config.js";
import { db } from "../db.js";
import type { Campaign, CampaignStatus } from "../types.js";

function scheduleFor(localDateISO: string) {
  const [hour, minute] = config.PUBLISH_TIME_LOCAL.split(":").map(Number);
  const target = DateTime.fromISO(localDateISO, { zone: config.APP_TIMEZONE })
    .set({ hour, minute, second: 0, millisecond: 0 });
  return target.toUTC();
}

export async function ensureTodayCampaign(): Promise<Campaign | null> {
  const now = DateTime.now().setZone(config.APP_TIMEZONE);
  const localDate = now.toISODate()!;
  const target = scheduleFor(localDate);
  const productionStart = target.minus({ minutes: config.PRODUCTION_LEAD_MINUTES });
  if (DateTime.utc() < productionStart.toUTC()) return null;

  const key = `${localDate}-techairevolution`;
  await db.execute(
    `INSERT INTO campaigns(campaign_key, local_date, target_publish_at_utc, status)
     VALUES (?, ?, ?, 'DISCOVER')
     ON DUPLICATE KEY UPDATE campaign_key=campaign_key`,
    [key, localDate, target.toUTC().toSQL({ includeOffset: false })]
  );
  const [rows] = await db.query<any[]>("SELECT * FROM campaigns WHERE campaign_key=? LIMIT 1", [key]);
  return rows[0] as Campaign;
}

export async function setStatus(id: number, status: CampaignStatus, detail?: Record<string, unknown>) {
  await db.execute("UPDATE campaigns SET status=? WHERE id=?", [status, id]);
  await db.execute(
    "INSERT INTO campaign_events(campaign_id,event_type,event_json) VALUES(?,?,?)",
    [id, `STATUS_${status}`, detail ? JSON.stringify(detail) : null]
  );
}

export async function failCampaign(id: number, code: string, detail: string) {
  await db.execute(
    "UPDATE campaigns SET status='FAILED', failure_code=?, failure_detail=? WHERE id=?",
    [code, detail.slice(0, 60000), id]
  );
}

export async function markResultUnknown(id: number, platform: string, detail: string) {
  await db.execute(
    "UPDATE campaigns SET status='RESULT_UNKNOWN', result_unknown=1, failure_code=?, failure_detail=? WHERE id=?",
    [`${platform}_RESULT_UNKNOWN`, detail.slice(0, 60000), id]
  );
}
