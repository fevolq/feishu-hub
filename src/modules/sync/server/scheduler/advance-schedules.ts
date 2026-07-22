import type { CompanySyncSchedule } from "@/modules/schedules/contracts";
import { getNextCronRunAt } from "@/modules/schedules/server/cron";
import {
  setCompanySyncScheduleRunTimes
} from "@/modules/schedules/server/repository";
import { appConfig } from "@/shared/server/config";
import { serverLogger } from "@/shared/server/logger";

export const advanceSchedules = (schedules: CompanySyncSchedule[], triggeredAt: string) => {
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
