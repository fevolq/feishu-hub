import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import {
  toPublicCompanies,
  updateCompanySortOrder
} from "@/modules/companies/server/repository";
import { companyOrderSchema } from "@/modules/companies/server/schemas";

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const parsed = companyOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    return NextResponse.json({
      companies: toPublicCompanies(updateCompanySortOrder(parsed.data.companyIds))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存公司排序失败" },
      { status: 400 }
    );
  }
}
