import { tick } from "./core/tick.js";
import { logger } from "./logger.js";

try {
  const result = await tick();
  logger.info({ result }, "cron tick complete");
  console.log(JSON.stringify(result));
  process.exit(0);
} catch (err) {
  logger.error({ err }, "cron tick failed");
  process.exit(1);
}
