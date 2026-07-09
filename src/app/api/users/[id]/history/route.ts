import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany } from "@/server/db/repositories/companies";
import { listUserHistory } from "@/server/db/repositories/org";
import { parsePositiveIntegerParam } from "@/server/http/route-params";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(request.nextUrl.searchParams.get("companyId") || "");
  if (!companyId) {
    return NextResponse.json({ error: "缺少 companyId" }, { status: 400 });
  }
  if (!getCompany(companyId)) {
    return NextResponse.json({ error: "公司不存在" }, { status: 404 });
  }

  return NextResponse.json({ events: listUserHistory(companyId, decodeURIComponent(id)) });
}
