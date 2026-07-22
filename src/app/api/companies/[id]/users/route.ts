import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import { listUsersPage } from "@/modules/organization/server/users-repository";
import { parsePaginationParams } from "@/shared/http/pagination";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

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
  const pagination = parsePaginationParams(search);
  if (!pagination) {
    return NextResponse.json({ error: "分页参数不正确" }, { status: 400 });
  }
  const status = normalizeStatusFilter(search.get("status"));
  const result = listUsersPage(
    companyId,
    {
      status,
      departmentId: search.get("departmentId") || undefined,
      query: search.get("q") || undefined
    },
    pagination
  );

  const { items: users, ...paginationMeta } = result;
  return NextResponse.json({ users, pagination: paginationMeta });
}
