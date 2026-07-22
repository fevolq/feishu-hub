import type { CompanySyncSchedule } from "@/modules/schedules/contracts";

export type DueScheduleBatch = {
  companyId: number;
  scheduleIds: number[];
};

export const buildDueScheduleBatches = <T extends Pick<CompanySyncSchedule, "id" | "companyId">>(
  schedules: T[]
): DueScheduleBatch[] => {
  const batches = new Map<number, number[]>();

  for (const schedule of schedules) {
    const ids = batches.get(schedule.companyId) || [];
    ids.push(schedule.id);
    batches.set(schedule.companyId, ids);
  }

  return Array.from(batches, ([companyId, scheduleIds]) => ({ companyId, scheduleIds }));
};
