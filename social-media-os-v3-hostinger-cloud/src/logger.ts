import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.x-cron-secret",
      "*.OPENAI_API_KEY",
      "*.FAL_KEY",
      "*.META_USER_ACCESS_TOKEN",
      "*.CLOUDINARY_API_SECRET",
      "*.DB_PASSWORD"
    ],
    censor: "[REDACTED]"
  }
});
