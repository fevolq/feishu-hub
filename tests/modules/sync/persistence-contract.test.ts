import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/modules/organization/domain/types";

const baseUser: User = {
  openId: "ou-contract-user",
  unionId: "on-contract-user",
  name: "Contract User",
  email: "contract@example.com",
  jobTitle: "Engineer",
  leaderOpenId: null,
  primaryDepartmentId: "legacy",
  departmentIds: ["legacy"],
  avatarUrl: null,
  mobile: null,
  status: "active",
  extra: { location: "Shanghai" }
};

describe("organization persistence contract", () => {
  it("preserves the full user lifecycle, soft deletion, and snapshot semantics", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-persistence-contract-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
    process.env.APP_TIMEZONE = "UTC";
    vi.resetModules();

    const [{ getDb }, { persistOrgSnapshot }, { createSyncRawSnapshot }] = await Promise.all([
      import("@/shared/server/db/connection"),
      import("@/modules/sync/server/persistence/persist-organization"),
      import("@/modules/sync/server/repositories/sync-raw-snapshots")
    ]);
    const db = getDb();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Persistence Contract Co", "cli_persist", "secret").lastInsertRowid
    );
    const insertSyncRun = db.prepare(
      `INSERT INTO sync_runs (company_id, trigger_type, status, started_at)
       VALUES (?, 'manual', 'running', ?)`
    );
    const departments = [
      {
        openDepartmentId: "root",
        parentOpenDepartmentId: null,
        name: "Root",
        extra: {}
      },
      {
        openDepartmentId: "legacy",
        parentOpenDepartmentId: "root",
        name: "Legacy",
        extra: {}
      }
    ];

    const runSnapshot = (
      occurredAt: string,
      users: User[],
      nextDepartments = departments
    ) => {
      const syncRunId = Number(insertSyncRun.run(companyId, occurredAt).lastInsertRowid);
      createSyncRawSnapshot({
        companyId,
        syncRunId,
        payload: { syncRunId, users: users.map((user) => user.openId) },
        capturedAt: occurredAt
      });
      const stats = persistOrgSnapshot({
        companyId,
        syncRunId,
        departments: nextDepartments,
        users,
        occurredAt
      });
      return { syncRunId, stats };
    };

    const created = runSnapshot("2026-01-01T00:00:00.000Z", [baseUser]);
    expect(created.stats).toEqual({
      departmentsCount: 2,
      usersCount: 1,
      createdCount: 1,
      updatedCount: 0,
      resignedCount: 0,
      restoredCount: 0
    });

    const unchanged = runSnapshot("2026-01-01T01:00:00.000Z", [baseUser], [departments[0]]);
    expect(unchanged.stats).toEqual({
      departmentsCount: 1,
      usersCount: 1,
      createdCount: 0,
      updatedCount: 0,
      resignedCount: 0,
      restoredCount: 0
    });
    expect(
      db
        .prepare(
          `SELECT status, deleted_at FROM departments
           WHERE company_id = ? AND open_department_id = 'legacy'`
        )
        .get(companyId)
    ).toEqual({ status: "deleted", deleted_at: "2026-01-01T01:00:00.000Z" });
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS total, MAX(captured_at) AS captured_at, MAX(sync_run_id) AS sync_run_id
           FROM user_daily_snapshots
           WHERE company_id = ? AND user_open_id = ? AND snapshot_date = '2026-01-01'`
        )
        .get(companyId, baseUser.openId)
    ).toEqual({
      total: 1,
      captured_at: "2026-01-01T01:00:00.000Z",
      sync_run_id: unchanged.syncRunId
    });
    expect(
      db
        .prepare(
          `SELECT last_seen_at, updated_at FROM users_current
           WHERE company_id = ? AND open_id = ?`
        )
        .get(companyId, baseUser.openId)
    ).toEqual({
      last_seen_at: "2026-01-01T01:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });
    expect(
      db
        .prepare("SELECT COUNT(*) AS total FROM user_change_events WHERE company_id = ?")
        .get(companyId)
    ).toEqual({ total: 1 });

    const updatedUser: User = {
      ...baseUser,
      name: "Contract User Renamed",
      primaryDepartmentId: "root",
      departmentIds: ["root"]
    };
    const updated = runSnapshot("2026-01-02T00:00:00.000Z", [updatedUser], [departments[0]]);
    expect(updated.stats.updatedCount).toBe(1);
    expect(updated.stats.createdCount).toBe(0);

    const resigned = runSnapshot("2026-01-03T00:00:00.000Z", [], [departments[0]]);
    expect(resigned.stats.resignedCount).toBe(1);
    expect(
      db
        .prepare(
          `SELECT status, resigned_at FROM users_current
           WHERE company_id = ? AND open_id = ?`
        )
        .get(companyId, baseUser.openId)
    ).toEqual({ status: "resigned", resigned_at: "2026-01-03T00:00:00.000Z" });

    const restored = runSnapshot("2026-01-04T00:00:00.000Z", [updatedUser], [departments[0]]);
    expect(restored.stats.restoredCount).toBe(1);
    expect(restored.stats.updatedCount).toBe(0);
    expect(
      db
        .prepare(
          `SELECT status, resigned_at, first_seen_at FROM users_current
           WHERE company_id = ? AND open_id = ?`
        )
        .get(companyId, baseUser.openId)
    ).toEqual({
      status: "active",
      resigned_at: null,
      first_seen_at: "2026-01-01T00:00:00.000Z"
    });

    const events = db
      .prepare(
        `SELECT type, changed_fields_json, sync_run_id
         FROM user_change_events
         WHERE company_id = ? AND user_open_id = ?
         ORDER BY occurred_at ASC, id ASC`
      )
      .all(companyId, baseUser.openId) as Array<{
      type: string;
      changed_fields_json: string;
      sync_run_id: number;
    }>;
    expect(events.map((event) => event.type)).toEqual([
      "created",
      "updated",
      "resigned",
      "restored"
    ]);
    expect(JSON.parse(events[1].changed_fields_json)).toEqual(
      expect.arrayContaining(["name", "primaryDepartmentId", "departmentIds"])
    );
    expect(events.map((event) => event.sync_run_id)).toEqual([
      created.syncRunId,
      updated.syncRunId,
      resigned.syncRunId,
      restored.syncRunId
    ]);

    expect(
      db
        .prepare(
          `SELECT snapshot_date, status, sync_run_id
           FROM user_daily_snapshots
           WHERE company_id = ? AND user_open_id = ?
           ORDER BY snapshot_date ASC`
        )
        .all(companyId, baseUser.openId)
    ).toEqual([
      { snapshot_date: "2026-01-01", status: "active", sync_run_id: unchanged.syncRunId },
      { snapshot_date: "2026-01-02", status: "active", sync_run_id: updated.syncRunId },
      { snapshot_date: "2026-01-03", status: "resigned", sync_run_id: resigned.syncRunId },
      { snapshot_date: "2026-01-04", status: "active", sync_run_id: restored.syncRunId }
    ]);

    const rawSnapshots = db
      .prepare(
        `SELECT sync_run_id, payload_json, captured_at
         FROM sync_raw_snapshots
         WHERE company_id = ?
         ORDER BY id ASC`
      )
      .all(companyId) as Array<{
      sync_run_id: number;
      payload_json: string;
      captured_at: string;
    }>;
    expect(rawSnapshots).toHaveLength(5);
    expect(rawSnapshots.map((snapshot) => snapshot.sync_run_id)).toEqual([
      created.syncRunId,
      unchanged.syncRunId,
      updated.syncRunId,
      resigned.syncRunId,
      restored.syncRunId
    ]);
    expect(rawSnapshots.map((snapshot) => JSON.parse(snapshot.payload_json))).toEqual([
      { syncRunId: created.syncRunId, users: [baseUser.openId] },
      { syncRunId: unchanged.syncRunId, users: [baseUser.openId] },
      { syncRunId: updated.syncRunId, users: [baseUser.openId] },
      { syncRunId: resigned.syncRunId, users: [] },
      { syncRunId: restored.syncRunId, users: [baseUser.openId] }
    ]);
  });
});
