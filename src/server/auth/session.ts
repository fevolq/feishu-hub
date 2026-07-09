import crypto from "node:crypto";
import { appConfig } from "@/server/config";

type SessionPayload = {
  exp: number;
};

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

const sign = (payload: string) =>
  crypto.createHmac("sha256", appConfig.sessionSecret).update(payload).digest("base64url");

export const createSessionCookie = () => {
  const payload = encode({ exp: Math.floor(Date.now() / 1000) + appConfig.sessionTtlSeconds });
  return `${payload}.${sign(payload)}`;
};

export const verifySessionCookie = (cookieValue: string | undefined) => {
  if (!cookieValue) {
    return false;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto.timingSafeEqual(provided, target)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

export const verifyPassword = (password: string) => {
  const provided = Buffer.from(password);
  const expected = Buffer.from(appConfig.appPassword);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: appConfig.sessionTtlSeconds
};

