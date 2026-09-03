import express from "express";
import helmet from "helmet";
import { db } from "./db.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { cronGuard, basicGuard } from "./security.js";
import { tick } from "./core/tick.js";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  logger.info(
    { method: req.method, path: req.path },
    "http request"
  );
  next();
});

app.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      ok: true,
      app: "TechAIrevolution Social Media OS V3",
      autopilot: config.AUTOPILOT_ENABLED,
      metaWrites: config.META_WRITE_ENABLED,
      timezone: config.APP_TIMEZONE,
      publishTime: config.PUBLISH_TIME_LOCAL,
      secretsPrinted: false
    });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post("/internal/tick", cronGuard, async (_req, res) => {
  const result = await tick();
  res.json(result);
});

app.get("/api/status", basicGuard, async (_req, res) => {
  const [campaigns] = await db.query<any[]>(
    "SELECT campaign_key,local_date,status,story_title,target_publish_at_utc,failure_code,updated_at FROM campaigns ORDER BY id DESC LIMIT 20"
  );

  res.json({
    autopilot: config.AUTOPILOT_ENABLED,
    metaWrites: config.META_WRITE_ENABLED,
    publishTime: config.PUBLISH_TIME_LOCAL,
    timezone: config.APP_TIMEZONE,
    campaigns
  });
});

app.get("/", basicGuard, async (_req, res) => {
  const [campaigns] = await db.query<any[]>(
    "SELECT campaign_key,status,story_title,updated_at FROM campaigns ORDER BY id DESC LIMIT 10"
  );

  const rows = campaigns
    .map(
      c =>
        `<tr><td>${c.campaign_key}</td><td>${c.status}</td><td>${c.story_title || ""}</td><td>${c.updated_at}</td></tr>`
    )
    .join("");

  res.type("html").send(`<!doctype html>
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TechAIrevolution Social Media OS</title>
  <style>
  body{font-family:Arial,sans-serif;background:#0b0b0f;color:#fff;margin:0;padding:32px}
  .wrap{max-width:1100px;margin:auto}.card{background:#15151c;border:1px solid #2b2b36;border-radius:18px;padding:22px;margin:18px 0}
  .pill{display:inline-block;padding:8px 12px;border-radius:999px;background:#222231}
  table{width:100%;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #2b2b36;text-align:left}
  h1{font-size:34px}.accent{color:#d14cff}
  </style></head><body><div class="wrap">
  <h1>Tech<span class="accent">AI</span>revolution — Social Media OS V3</h1>
  <div class="card">
  <span class="pill">Autopilot: ${config.AUTOPILOT_ENABLED ? "ON" : "OFF"}</span>
  <span class="pill">Meta writes: ${config.META_WRITE_ENABLED ? "ON" : "OFF"}</span>
  <span class="pill">Target: ${config.PUBLISH_TIME_LOCAL} ${config.APP_TIMEZONE}</span>
  </div>
  <div class="card"><h2>Recent campaigns</h2>
  <table><tr><th>Campaign</th><th>Status</th><th>Story</th><th>Updated</th></tr>${rows}</table></div>
  </div></body></html>`);
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Social Media OS V3 listening");
});
