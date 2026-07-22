import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().trim().min(1),
  appId: z.string().trim().min(1),
  appSecret: z.string().trim().min(1),
  enabled: z.boolean().optional()
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).optional(),
  appId: z.string().trim().min(1).optional(),
  appSecret: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional()
});

export const companyOrderSchema = z.object({
  companyIds: z.array(z.coerce.number().int().positive()).min(1)
});
