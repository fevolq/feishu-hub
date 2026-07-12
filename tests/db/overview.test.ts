import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadOverviewRepository = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-overview-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();

  const repository = await import("@/server/db/repositories/overview");
  const { getDb } = await import("@/server/db/connection");
  return { repository, db: getDb() };
};

describe("company overview", () => {
  it("includes employee, history, recent joined, and recent resigned counts", async () => {
    const { repository, db } = await loadOverviewRepository();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );
    const insertUser = db.prepare(
      `INSERT INTO users_current
        (company_id, open_id, name, status, department_ids_json, extra_json,
         first_seen_at, last_seen_at, updated_at)
       VALUES (?, ?, ?, ?, '[]', '{}', ?, ?, ?)`
    );
    insertUser.run(companyId, "active-a", "Active A", "active", "2026-01-01", "2026-01-10", "2026-01-10");
    insertUser.run(companyId, "active-b", "Active B", "active", "2026-01-01", "2026-01-10", "2026-01-10");
    insertUser.run(companyId, "resigned", "Resigned", "resigned", "2026-01-01", "2026-01-10", "2026-01-10");

    const insertEvent = db.prepare(
      `INSERT INTO user_change_events
        (company_id, user_open_id, type, changed_fields_json, occurred_at)
       VALUES (?, ?, ?, '[]', ?)`
    );
    insertEvent.run(companyId, "active-a", "created", "2026-01-09");
    insertEvent.run(companyId, "active-b", "restored", "2026-01-10");
    insertEvent.run(companyId, "resigned", "resigned", "2026-01-10");
    insertEvent.run(companyId, "active-a", "updated", "2026-01-01");

    expect(repository.listCompanyOverviewCards("2026-01-08")).toEqual([
      {
        id: companyId,
        name: "Alpha",
        employeeCount: 2,
        historyCount: 4,
        recentJoinedCount: 2,
        recentResignedCount: 1
      }
    ]);
  });
});
