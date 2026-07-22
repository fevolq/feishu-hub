import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import {
  deleteCompanySyncSchedule,
  getCompanySyncSchedule
} from "@/modules/schedules/server/repository";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";
import { updateScheduleSchema } from "@/modules/schedules/server/schemas";
import { updateSchedule } from "@/modules/schedules/server/service";

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

  const parsed = updateScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const schedule = updateSchedule(companyId, scheduleId, current, parsed.data);
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
