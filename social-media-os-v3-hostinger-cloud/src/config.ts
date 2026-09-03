import "dotenv/config";
import { z } from "zod";

const boolString = z
  .enum(["true", "false"])
  .default("false")
  .transform(v => v === "true");

const schema = z.object({
  NODE_ENV: z.string().default("production"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_REASONING_MODEL: z.string().default("gpt-5.6-sol"),
  OPENAI_VISION_MODEL: z.string().default("gpt-5.6-sol"),

  FAL_KEY: z.string().min(1),
  FAL_IMAGE_MODEL: z.string().default("openai/gpt-image-2"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  META_API_VERSION: z.string().default("v24.0"),
  META_USER_ACCESS_TOKEN: z.string().optional(),
  META_IG_USER_ID: z.string().optional(),
  META_FB_PAGE_ID: z.string().optional(),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),

  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
  PUBLISH_TIME_LOCAL: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
  PRODUCTION_LEAD_MINUTES: z.coerce.number().int().positive().default(120),

  AUTOPILOT_ENABLED: boolString,
  META_WRITE_ENABLED: boolString,

  CREATIVE_SCORE_MINIMUM: z.coerce.number().min(0).max(100).default(90),
  MAX_REPAIR_ROUNDS: z.coerce.number().int().min(0).max(5).default(3),

  DASHBOARD_USER: z.string().default("admin"),
  DASHBOARD_PASSWORD: z.string().min(8),
  CRON_SECRET: z.string().min(20)
});

export const config = schema.parse(process.env);
