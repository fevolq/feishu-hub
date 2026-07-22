import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/shared/server/config";
import {
  createSessionCookie,
  sessionCookieOptions,
  verifyPassword
} from "@/modules/auth/server/session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !verifyPassword(body.password)) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(appConfig.authCookieName, createSessionCookie(), sessionCookieOptions);
  return response;
}

