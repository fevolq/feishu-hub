import { describe, expect, it } from "vitest";
import { getNextCronRunAt, validateCrontabExpression } from "@/server/sync/cron";

describe("crontab scheduling", () => {
  it("calculates the next run by application timezone", () => {
    expect(getNextCronRunAt("0 9 * * *", "2026-07-08T00:30:00.000Z", "Asia/Shanghai")).toBe(
      "2026-07-08T01:00:00.000Z"
    );
  });

  it("rejects invalid crontab expressions", () => {
    expect(() => validateCrontabExpression("not a cron")).toThrow("Invalid crontab expression");
  });
});
