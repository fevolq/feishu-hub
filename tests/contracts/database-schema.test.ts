import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const expectedColumns: Record<string, string[]> = {
  companies: [
    "id", "name", "app_id", "app_secret", "enabled", "sort_order", "created_at", "updated_at"
  ],
  company_sync_schedules: [
    "id", "company_id", "name", "cron_expression", "enabled", "last_triggered_at",
    "next_run_at", "created_at", "updated_at"
  ],
  sync_runs: [
    "id", "company_id", "trigger_type", "status", "started_at", "finished_at",
    "departments_count", "users_count", "created_count", "updated_count",
    "resigned_count", "restored_count", "error"
  ],
  sync_raw_snapshots: [
    "id", "company_id", "sync_run_id", "payload_json", "captured_at", "created_at"
  ],
  departments: [
    "company_id", "open_department_id", "parent_open_department_id", "name", "status",
    "deleted_at", "extra_json", "updated_at"
  ],
  users_current: [
    "id", "company_id", "open_id", "union_id", "name", "email", "job_title",
    "leader_open_id", "primary_department_id", "department_ids_json", "avatar_url",
    "mobile", "status", "extra_json", "first_seen_at", "last_seen_at", "resigned_at",
    "updated_at"
  ],
  user_departments: ["company_id", "user_open_id", "open_department_id"],
  user_daily_snapshots: [
    "id", "company_id", "user_open_id", "snapshot_date", "snapshot_json", "status",
    "name", "email", "job_title", "leader_open_id", "primary_department_id",
    "department_ids_json", "captured_at", "sync_run_id"
  ],
  user_change_events: [
    "id", "company_id", "user_open_id", "type", "changed_fields_json", "before_json",
    "after_json", "occurred_at", "sync_run_id"
  ]
};

const expectedIndexes = [
  "idx_companies_name",
  "idx_companies_sort_order",
  "idx_company_sync_schedules_company",
  "idx_company_sync_schedules_due",
  "idx_departments_parent",
  "idx_sync_raw_snapshots_company_time",
  "idx_sync_runs_company",
  "idx_user_change_events_company_time",
  "idx_user_change_events_user",
  "idx_user_daily_snapshots_company_date",
  "idx_user_daily_snapshots_user",
  "idx_user_departments_dept",
  "idx_users_current_company_status",
  "idx_users_current_department"
];

describe("database structure contract", () => {
  it("keeps every table, column, index, and foreign-key target unchanged", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-schema-contract-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
    vi.resetModules();

    const { getDb } = await import("@/shared/server/db/connection");
    const db = getDb();
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(Object.keys(expectedColumns).sort());
    for (const [table, expected] of Object.entries(expectedColumns)) {
      const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row) => (row as { name: string }).name);
      expect(columns, table).toEqual(expected);
    }

    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%'
         ORDER BY name`
      )
      .all()
      .map((row) => (row as { name: string }).name);
    expect(indexes).toEqual(expectedIndexes);

    const foreignKeyTargets = tables.flatMap((table) =>
      db.prepare(`PRAGMA foreign_key_list(${table})`).all().map((row) => {
        const key = row as { from: string; table: string; to: string; on_delete: string };
        return `${table}.${key.from}->${key.table}.${key.to}:${key.on_delete}`;
      })
    );
    expect(foreignKeyTargets.sort()).toEqual([
      "company_sync_schedules.company_id->companies.id:CASCADE",
      "departments.company_id->companies.id:CASCADE",
      "sync_raw_snapshots.company_id->companies.id:CASCADE",
      "sync_raw_snapshots.sync_run_id->sync_runs.id:CASCADE",
      "sync_runs.company_id->companies.id:CASCADE",
      "user_change_events.company_id->companies.id:CASCADE",
      "user_change_events.sync_run_id->sync_runs.id:SET NULL",
      "user_daily_snapshots.company_id->companies.id:CASCADE",
      "user_daily_snapshots.sync_run_id->sync_runs.id:SET NULL",
      "user_departments.company_id->companies.id:CASCADE",
      "users_current.company_id->companies.id:CASCADE"
    ]);
  });
});
