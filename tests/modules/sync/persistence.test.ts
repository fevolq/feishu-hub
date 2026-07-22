import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import type { NormalizedUser } from "@/modules/organization/domain/types";

const loadSyncPersistence = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-persist-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();

  const persistence = await import("@/modules/sync/server/persistence/persist-organization");
  const { getDb } = await import("@/shared/server/db/connection");
  return { persistence, db: getDb() };
};

const baseUser: NormalizedUser = {
  openId: "ou_1",
  unionId: "on_1",
  name: "张三",
  email: "zhangsan@example.com",
  jobTitle: "工程师",
  leaderOpenId: null,
  primaryDepartmentId: null,
  departmentIds: [],
  avatarUrl: null,
  mobile: null,
  status: "active",
  extra: {}
};

const insertSyncRun = (
  db: BetterSqlite3.Database,
  id: number,
  companyId: number,
  startedAt: string
) => {
  db
    .prepare(
      `INSERT INTO sync_runs (id, company_id, trigger_type, status, started_at)
       VALUES (?, ?, 'manual', 'running', ?)`
    )
    .run(id, companyId, startedAt);
};

describe("persistOrgSnapshot", () => {
  it("keeps user updated_at unchanged when the user snapshot did not change", async () => {
    const { persistence, db } = await loadSyncPersistence();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );

    insertSyncRun(db, 1, companyId, "2026-01-01T00:00:00.000Z");
    persistence.persistOrgSnapshot({
      companyId,
      syncRunId: 1,
      departments: [],
      users: [baseUser],
      occurredAt: "2026-01-01T00:00:00.000Z"
    });

    insertSyncRun(db, 2, companyId, "2026-01-02T00:00:00.000Z");
    const unchangedStats = persistence.persistOrgSnapshot({
      companyId,
      syncRunId: 2,
      departments: [],
      users: [baseUser],
      occurredAt: "2026-01-02T00:00:00.000Z"
    });

    expect(unchangedStats.updatedCount).toBe(0);
    expect(
      db
        .prepare("SELECT last_seen_at, updated_at FROM users_current WHERE company_id = ? AND open_id = ?")
        .get(companyId, baseUser.openId)
    ).toEqual({
      last_seen_at: "2026-01-02T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    insertSyncRun(db, 3, companyId, "2026-01-03T00:00:00.000Z");
    const changedStats = persistence.persistOrgSnapshot({
      companyId,
      syncRunId: 3,
      departments: [],
      users: [{ ...baseUser, jobTitle: "高级工程师" }],
      occurredAt: "2026-01-03T00:00:00.000Z"
    });

    expect(changedStats.updatedCount).toBe(1);
    expect(
      db
        .prepare("SELECT last_seen_at, updated_at FROM users_current WHERE company_id = ? AND open_id = ?")
        .get(companyId, baseUser.openId)
    ).toEqual({
      last_seen_at: "2026-01-03T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z"
    });
  });
});
