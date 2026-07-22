import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import { listDepartments } from "@/modules/organization/server/departments-repository";
import { listUsersPage } from "@/modules/organization/server/users-repository";
import { DEFAULT_PAGE_SIZE } from "@/shared/contracts/pagination";
import {
  buildDepartmentTree,
  getDescendantDepartmentIds
} from "@/modules/organization/domain/department-tree";
import { parsePaginationParams } from "@/shared/http/pagination";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

const parseEmployeeScope = (value: string | null) => {
  return value === "descendant" ? "descendant" : "direct";
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
  const departmentId = search.get("departmentId") || undefined;
  const departments = listDepartments(companyId);
  if (!departmentId) {
    return NextResponse.json({
      tree: buildDepartmentTree(departments),
      users: [],
      pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 }
    });
  }

  const pagination = parsePaginationParams(search);
  if (!pagination) {
    return NextResponse.json({ error: "分页参数不正确" }, { status: 400 });
  }

  const scope = parseEmployeeScope(search.get("scope"));
  const filters = scope === "direct"
    ? { departmentId }
    : { departmentIds: getDescendantDepartmentIds(departments, departmentId) };
  const result = filters.departmentId || filters.departmentIds?.length
    ? listUsersPage(companyId, filters, pagination)
    : { items: [], total: 0, ...pagination };
  const { items: users, ...paginationMeta } = result;

  return NextResponse.json({
    users,
    pagination: paginationMeta
  });
}
