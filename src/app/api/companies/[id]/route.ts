import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany, updateCompany } from "@/server/db/repositories/companies";
import { parsePositiveIntegerParam } from "@/server/http/route-params";

const updateCompanySchema = z.object({
  name: z.string().trim().min(1).optional(),
  appId: z.string().trim().min(1).optional(),
  appSecret: z.string().trim().min(1).optional(),
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

  const company = getCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }
  return NextResponse.json({ company });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(id);
  if (!companyId) {
    return NextResponse.json({ error: "公司 ID 不正确" }, { status: 400 });
  }

  const parsed = updateCompanySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  const company = updateCompany(companyId, parsed.data);
  if (!company) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }
  return NextResponse.json({ company });
}
