import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/auth/guards";
import { createCompany, listCompanies } from "@/server/db/repositories/companies";

const companySchema = z.object({
  name: z.string().trim().min(1),
  appId: z.string().trim().min(1),
  appSecret: z.string().trim().min(1),
  enabled: z.boolean().optional()
});

export async function GET() {
  const auth = await requireApiAuth();
  if (auth) return auth;

  return NextResponse.json({ companies: listCompanies() });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const parsed = companySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    return NextResponse.json({ company: createCompany(parsed.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建公司失败" },
      { status: 500 }
    );
  }
}
