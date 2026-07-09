import "dotenv/config";
import path from "node:path";

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveFromCwd = (value: string) => {
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(process.cwd(), value);
};

export const appConfig = {
  appPassword: process.env.APP_PASSWORD || "change-me",
  sessionSecret: process.env.SESSION_SECRET || "change-me",
  authCookieName: "feishu-hub",
  sessionTtlSeconds: 60 * 60 * 24 * 7,
  databasePath: resolveFromCwd(process.env.DATABASE_PATH || "./data/feishu-hub.sqlite"),
  feishuApiBaseUrl: process.env.FEISHU_API_BASE_URL || "https://open.feishu.cn/open-apis",
  syncPollSeconds: toNumber(process.env.SYNC_POLL_SECONDS, 60),
  timezone: process.env.APP_TIMEZONE || "Asia/Shanghai"
};
