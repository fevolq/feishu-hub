import { runSchedulerLoop } from "@/modules/sync/server/scheduler";
import { serverLogger } from "@/shared/server/logger";

runSchedulerLoop().catch((error) => {
  serverLogger.error("[scheduler] fatal error", error);
  process.exit(1);
});
