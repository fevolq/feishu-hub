import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import { listCompanySyncSchedules } from "@/modules/schedules/server/repository";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";
import { createScheduleSchema } from "@/modules/schedules/server/schemas";
import { createSchedule } from "@/modules/schedules/server/service";

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

  const parsed = createScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const schedule = createSchedule(companyId, parsed.data);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "定时任务创建失败" },
      { status: 400 }
    );
  }
}
