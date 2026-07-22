import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { getCompany } from "@/modules/companies/server/repository";
import { listUserHistoryPage } from "@/modules/organization/server/user-history-repository";
import { COMPACT_PAGE_SIZE } from "@/shared/contracts/pagination";
import { parsePaginationParams } from "@/shared/http/pagination";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

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

  const pagination = parsePaginationParams(request.nextUrl.searchParams, COMPACT_PAGE_SIZE);
  if (!pagination) {
    return NextResponse.json({ error: "分页参数不正确" }, { status: 400 });
  }

  const result = listUserHistoryPage(companyId, decodeURIComponent(id), pagination);
  const { items: events, ...paginationMeta } = result;
  return NextResponse.json({ events, pagination: paginationMeta });
}
