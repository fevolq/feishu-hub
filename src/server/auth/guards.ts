import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { appConfig } from "@/server/config";
import { verifySessionCookie } from "@/server/auth/session";

export const isAuthenticated = async () => {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(appConfig.authCookieName)?.value);
};

export const requirePageAuth = async () => {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
};

export const requireApiAuth = async () => {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
  }
  return null;
};
