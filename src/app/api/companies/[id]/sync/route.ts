import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import { syncCompany } from "@/modules/sync/server/sync-company";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const { id } = await context.params;
  const companyId = parsePositiveIntegerParam(id);
  if (!companyId) {
    return NextResponse.json({ error: "公司 ID 不正确" }, { status: 400 });
  }

  try {
    const result = await syncCompany(companyId, "manual");
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 }
    );
  }
}
