import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import {
  listRecentCompanyUsersPage
} from "@/modules/overview/server/repository";
import type { RecentActivityType } from "@/modules/overview/contracts";
import { COMPACT_PAGE_SIZE } from "@/shared/contracts/pagination";
import { normalizeDateTimeParam } from "@/shared/http/date-params";
import { parsePaginationParams } from "@/shared/http/pagination";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

const parseActivityType = (value: string | null): RecentActivityType | null => {
  return value === "joined" || value === "resigned" ? value : null;
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

  const type = parseActivityType(request.nextUrl.searchParams.get("type"));
  const since = normalizeDateTimeParam(request.nextUrl.searchParams.get("since"));
  const pagination = parsePaginationParams(request.nextUrl.searchParams, COMPACT_PAGE_SIZE);
  if (!type || !since || !pagination) {
    return NextResponse.json({ error: "查询参数不正确" }, { status: 400 });
  }

  const result = listRecentCompanyUsersPage(companyId, type, since, pagination);
  const { items: users, ...paginationMeta } = result;
  return NextResponse.json({ users, pagination: paginationMeta });
}
