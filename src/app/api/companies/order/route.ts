import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/auth/guards";
import { updateCompanySortOrder } from "@/server/db/repositories/companies";

const companyOrderSchema = z.object({
  companyIds: z.array(z.coerce.number().int().positive()).min(1)
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const parsed = companyOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    return NextResponse.json({ companies: updateCompanySortOrder(parsed.data.companyIds) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存公司排序失败" },
      { status: 400 }
    );
  }
}
