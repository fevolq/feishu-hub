import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/guards";
import { listDepartments, listUsers } from "@/server/db/repositories/org";
import { buildDepartmentTree, getDepartmentAndDescendantIds } from "@/server/org/departments";
import { parsePositiveIntegerParam } from "@/server/http/route-params";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(id);
  if (!companyId) {
    return NextResponse.json({ error: "公司 ID 不正确" }, { status: 400 });
  }

  const departmentId = request.nextUrl.searchParams.get("departmentId") || undefined;
  const departments = listDepartments(companyId);
  const descendantDepartmentIds = departmentId ? getDepartmentAndDescendantIds(departments, departmentId) : [];
  const directUsers = departmentId ? listUsers(companyId, { departmentId }) : [];

  return NextResponse.json({
    departments,
    tree: buildDepartmentTree(departments),
    users: directUsers,
    directUsers,
    descendantUsers: descendantDepartmentIds.length
      ? listUsers(companyId, { departmentIds: descendantDepartmentIds })
      : []
  });
}
