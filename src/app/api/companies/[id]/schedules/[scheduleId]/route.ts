import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany } from "@/server/db/repositories/companies";
import {
  deleteCompanySyncSchedule,
  getCompanySyncSchedule,
  updateCompanySyncSchedule
} from "@/server/db/repositories/sync-schedules";
import { parsePositiveIntegerParam } from "@/server/http/route-params";
import { getNextCronRunAt, validateCrontabExpression } from "@/server/sync/cron";

const scheduleUpdateSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  cronExpression: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional()
});

type RouteContext = {
  params: Promise<{ id: string; scheduleId: string }>;
};

const getRouteIds = async (context: RouteContext) => {
  const { id, scheduleId } = await context.params;
  return {
    companyId: parsePositiveIntegerParam(id),
    scheduleId: parsePositiveIntegerParam(scheduleId)
  };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { companyId, scheduleId } = await getRouteIds(context);
  if (!companyId || !scheduleId) {
    return NextResponse.json({ error: "路由参数不正确" }, { status: 400 });
  }
  if (!getCompany(companyId)) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }

  const current = getCompanySyncSchedule(companyId, scheduleId);
  if (!current) {
    return NextResponse.json({ error: "定时任务不存在" }, { status: 404 });
  }

  const parsed = scheduleUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cronExpression =
      parsed.data.cronExpression === undefined
        ? current.cronExpression
        : validateCrontabExpression(parsed.data.cronExpression);
    const enabled = parsed.data.enabled ?? current.enabled;
    const shouldRecalculateNextRun =
      enabled && (parsed.data.cronExpression !== undefined || parsed.data.enabled === true);
    const nextRunAt = enabled
      ? shouldRecalculateNextRun
        ? getNextCronRunAt(cronExpression)
        : current.nextRunAt
      : null;
    const schedule = updateCompanySyncSchedule(companyId, scheduleId, {
      ...parsed.data,
      cronExpression,
      enabled,
      nextRunAt
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "定时任务保存失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { companyId, scheduleId } = await getRouteIds(context);
  if (!companyId || !scheduleId) {
    return NextResponse.json({ error: "路由参数不正确" }, { status: 400 });
  }
  if (!getCompany(companyId)) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }

  if (!deleteCompanySyncSchedule(companyId, scheduleId)) {
    return NextResponse.json({ error: "定时任务不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
