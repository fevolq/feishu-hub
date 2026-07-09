import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany } from "@/server/db/repositories/companies";
import {
  createCompanySyncSchedule,
  listCompanySyncSchedules
} from "@/server/db/repositories/sync-schedules";
import { parsePositiveIntegerParam } from "@/server/http/route-params";
import { getNextCronRunAt, validateCrontabExpression } from "@/server/sync/cron";

const scheduleSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  cronExpression: z.string().trim().min(1),
  enabled: z.boolean().optional()
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(id);
  if (!companyId) {
    return NextResponse.json({ error: "公司 ID 不正确" }, { status: 400 });
  }
  if (!getCompany(companyId)) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }

  return NextResponse.json({ schedules: listCompanySyncSchedules(companyId) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(id);
  if (!companyId) {
    return NextResponse.json({ error: "公司 ID 不正确" }, { status: 400 });
  }
  if (!getCompany(companyId)) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }

  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cronExpression = validateCrontabExpression(parsed.data.cronExpression);
    const enabled = parsed.data.enabled ?? true;
    const schedule = createCompanySyncSchedule(companyId, {
      name: parsed.data.name,
      cronExpression,
      enabled,
      nextRunAt: enabled ? getNextCronRunAt(cronExpression) : null
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "定时任务创建失败" },
      { status: 400 }
    );
  }
}
