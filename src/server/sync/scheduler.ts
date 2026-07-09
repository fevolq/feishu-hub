import { appConfig } from "@/server/config";
import {
  listDueCompanySyncSchedules,
  setCompanySyncScheduleRunTimes,
  type CompanySyncSchedule
} from "@/server/db/repositories/sync-schedules";
import { serverLogger } from "@/server/logger";
import { getNextCronRunAt } from "@/server/sync/cron";
import { syncCompany } from "@/server/sync/runner";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DueScheduleBatch = {
  companyId: number;
  scheduleIds: number[];
};

export const buildDueScheduleBatches = (
  schedules: Pick<CompanySyncSchedule, "id" | "companyId">[]
): DueScheduleBatch[] => {
  const batches = new Map<number, number[]>();

  for (const schedule of schedules) {
    const ids = batches.get(schedule.companyId) || [];
    ids.push(schedule.id);
    batches.set(schedule.companyId, ids);
  }

  return Array.from(batches, ([companyId, scheduleIds]) => ({ companyId, scheduleIds }));
};

const advanceSchedules = (schedules: CompanySyncSchedule[], triggeredAt: string) => {
  for (const schedule of schedules) {
    try {
      setCompanySyncScheduleRunTimes(
        schedule.id,
        triggeredAt,
        getNextCronRunAt(schedule.cronExpression, triggeredAt, appConfig.timezone)
      );
    } catch (error) {
      serverLogger.error(`[scheduler] invalid crontab for schedule ${schedule.id}`, error);
    }
  }
};

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
