import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/modules/auth/server/guards";
import {
  createCompany,
  listCompanies,
  toPublicCompanies,
  toPublicCompany
} from "@/modules/companies/server/repository";
import { createCompanySchema } from "@/modules/companies/server/schemas";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth) return auth;

  return NextResponse.json({ companies: toPublicCompanies(listCompanies()) });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth) return auth;

  const parsed = createCompanySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不正确", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const company = createCompany(parsed.data);
    return NextResponse.json(
      { company: company ? toPublicCompany(company) : null },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建公司失败" },
      { status: 500 }
    );
  }
}
