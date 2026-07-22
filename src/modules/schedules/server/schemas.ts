import { z } from "zod";

export const createScheduleSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  cronExpression: z.string().trim().min(1),
  enabled: z.boolean().optional()
});

export const updateScheduleSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  cronExpression: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional()
});
