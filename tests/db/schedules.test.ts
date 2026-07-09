import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadRepositories = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-schedules-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();
  const companies = await import("@/server/db/repositories/companies");
  const schedules = await import("@/server/db/repositories/sync-schedules");
  return { companies, schedules };
};

describe("company sync schedules", () => {
  it("does not list due schedules for disabled companies", async () => {
    const { companies, schedules } = await loadRepositories();
    const enabledCompany = companies.createCompany({
      name: "Enabled",
      appId: "cli_enabled",
      appSecret: "secret"
    });
    const disabledCompany = companies.createCompany({
      name: "Disabled",
      appId: "cli_disabled",
      appSecret: "secret",
      enabled: false
    });

    schedules.createCompanySyncSchedule(enabledCompany!.id, {
      cronExpression: "0 9 * * *",
      nextRunAt: "2026-07-09T00:00:00.000Z"
    });
    schedules.createCompanySyncSchedule(disabledCompany!.id, {
      cronExpression: "0 9 * * *",
      nextRunAt: "2026-07-09T00:00:00.000Z"
    });

    expect(
      schedules
        .listDueCompanySyncSchedules("2026-07-09T01:00:00.000Z")
        .map((schedule) => schedule.companyId)
    ).toEqual([enabledCompany!.id]);
  });
});
