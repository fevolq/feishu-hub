import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany } from "@/server/db/repositories/companies";
import { listUsers } from "@/server/db/repositories/org";
import { parsePositiveIntegerParam } from "@/server/http/route-params";

const normalizeStatusFilter = (value: string | null) => {
  if (value === "all" || value === "active" || value === "resigned") return value;
  return undefined;
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  const search = request.nextUrl.searchParams;
  const status = normalizeStatusFilter(search.get("status"));
  const users = listUsers(companyId, {
    status,
    departmentId: search.get("departmentId") || undefined,
    query: search.get("q") || undefined
  });

  return NextResponse.json({ users });
}
