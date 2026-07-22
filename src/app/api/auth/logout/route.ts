import { NextResponse } from "next/server";
import { appConfig } from "@/shared/server/config";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(appConfig.authCookieName, "", {
    path: "/",
    maxAge: 0
  });
  return response;
}

