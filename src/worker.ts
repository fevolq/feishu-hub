import { runSchedulerLoop } from "./server/sync/scheduler";
import { serverLogger } from "./server/logger";

runSchedulerLoop().catch((error) => {
  serverLogger.error("[scheduler] fatal error", error);
  process.exit(1);
});
