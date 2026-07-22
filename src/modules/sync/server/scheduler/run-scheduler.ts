import { listDueCompanySyncSchedules } from "@/modules/schedules/server/repository";
import { appConfig } from "@/shared/server/config";
import { serverLogger } from "@/shared/server/logger";
import { syncCompany } from "../sync-company";
import { advanceSchedules } from "./advance-schedules";
import { buildDueScheduleBatches } from "./batches";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runScheduledSyncOnce = async () => {
  const schedules = listDueCompanySyncSchedules(new Date().toISOString());
  const batches = buildDueScheduleBatches(schedules);

  for (const batch of batches) {
    const batchSchedules = schedules.filter((schedule) => batch.scheduleIds.includes(schedule.id));
    try {
      await syncCompany(batch.companyId, "schedule");
    } catch (error) {
      serverLogger.error(`[scheduler] company ${batch.companyId} sync failed`, error);
    } finally {
      advanceSchedules(batchSchedules, new Date().toISOString());
    }
  }

  return batches.length;
};

export const runSchedulerLoop = async () => {
  serverLogger.info(`[scheduler] polling every ${appConfig.syncPollSeconds}s`);
  for (;;) {
    await runScheduledSyncOnce();
    await sleep(appConfig.syncPollSeconds * 1000);
  }
};
