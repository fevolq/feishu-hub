import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/guards";
import { getCompany } from "@/server/db/repositories/companies";
import {
  listRecentCompanyUsers,
  type RecentActivityType
} from "@/server/db/repositories/overview";
import { normalizeDateTimeParam } from "@/server/http/date-params";
import { parsePositiveIntegerParam } from "@/server/http/route-params";

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
  if (!type || !since) {
    return NextResponse.json({ error: "查询参数不正确" }, { status: 400 });
  }

  return NextResponse.json({ users: listRecentCompanyUsers(companyId, type, since) });
}
