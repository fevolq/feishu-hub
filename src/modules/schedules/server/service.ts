import type { z } from "zod";
import { getNextCronRunAt, validateCrontabExpression } from "./cron";
import {
  createCompanySyncSchedule,
  updateCompanySyncSchedule
} from "./repository";
import type { CompanySyncSchedule } from "../contracts";
import type { createScheduleSchema, updateScheduleSchema } from "./schemas";

type CreateScheduleRequest = z.infer<typeof createScheduleSchema>;
type UpdateScheduleRequest = z.infer<typeof updateScheduleSchema>;

export const createSchedule = (companyId: number, input: CreateScheduleRequest) => {
  const cronExpression = validateCrontabExpression(input.cronExpression);
  const enabled = input.enabled ?? true;
  return createCompanySyncSchedule(companyId, {
    name: input.name,
    cronExpression,
    enabled,
    nextRunAt: enabled ? getNextCronRunAt(cronExpression) : null
  });
};

export const updateSchedule = (
  companyId: number,
  scheduleId: number,
  current: CompanySyncSchedule,
  input: UpdateScheduleRequest
) => {
  const cronExpression = input.cronExpression === undefined
    ? current.cronExpression
    : validateCrontabExpression(input.cronExpression);
  const enabled = input.enabled ?? current.enabled;
  const shouldRecalculateNextRun =
    enabled && (input.cronExpression !== undefined || input.enabled === true);
  const nextRunAt = enabled
    ? shouldRecalculateNextRun
      ? getNextCronRunAt(cronExpression)
      : current.nextRunAt
    : null;

  return updateCompanySyncSchedule(companyId, scheduleId, {
    ...input,
    cronExpression,
    enabled,
    nextRunAt
  });
};
