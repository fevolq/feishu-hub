import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { formatDepartmentDisplayName } from "@/server/db/repositories/org";

const loadUsersRepository = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-users-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();

  const repository = await import("@/server/db/repositories/org");
  const { getDb } = await import("@/server/db/connection");
  return { repository, db: getDb() };
};

describe("department display name", () => {
  it("marks deleted departments in user-facing text", () => {
    expect(formatDepartmentDisplayName("美术组", "deleted")).toBe("美术组（已取消）");
  });

  it("keeps active department names unchanged", () => {
    expect(formatDepartmentDisplayName("美术组", "active")).toBe("美术组");
  });
});

describe("user ordering", () => {
  it("lists users by information update time descending", async () => {
    const { repository, db } = await loadUsersRepository();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );
    const insertUser = db.prepare(
      `INSERT INTO users_current
        (company_id, open_id, name, department_ids_json, extra_json,
         first_seen_at, last_seen_at, updated_at)
       VALUES (?, ?, ?, '[]', '{}', ?, ?, ?)`
    );

    insertUser.run(companyId, "early", "Early", "2026-01-01", "2026-01-01", "2026-01-01");
    insertUser.run(companyId, "recent-a", "Recent A", "2026-01-01", "2026-01-03", "2026-01-03");
    insertUser.run(companyId, "recent-b", "Recent B", "2026-01-01", "2026-01-03", "2026-01-03");

    expect(repository.listUsers(companyId).map((user) => user.openId)).toEqual([
      "recent-b",
      "recent-a",
      "early"
    ]);
  });
});

describe("department user filters", () => {
  it("includes multi-department users when they belong to a descendant department", async () => {
    const { repository, db } = await loadUsersRepository();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );
    const insertUser = db.prepare(
      `INSERT INTO users_current
        (company_id, open_id, name, department_ids_json, extra_json,
         first_seen_at, last_seen_at, updated_at)
       VALUES (?, ?, ?, ?, '{}', ?, ?, ?)`
    );
    const insertDepartment = db.prepare(
      `INSERT INTO user_departments (company_id, user_open_id, open_department_id)
       VALUES (?, ?, ?)`
    );

    insertUser.run(
      companyId,
      "direct",
      "Direct",
      JSON.stringify(["parent"]),
      "2026-01-01",
      "2026-01-01",
      "2026-01-01"
    );
    insertUser.run(
      companyId,
      "descendant",
      "Descendant",
      JSON.stringify(["child"]),
      "2026-01-01",
      "2026-01-01",
      "2026-01-01"
    );
    insertUser.run(
      companyId,
      "both",
      "Both",
      JSON.stringify(["parent", "child"]),
      "2026-01-01",
      "2026-01-01",
      "2026-01-01"
    );
    insertDepartment.run(companyId, "direct", "parent");
    insertDepartment.run(companyId, "descendant", "child");
    insertDepartment.run(companyId, "both", "parent");
    insertDepartment.run(companyId, "both", "child");

    expect(
      repository
        .listUsers(companyId, {
          departmentIds: ["child"]
        })
        .map((user) => user.openId)
    ).toEqual(["both", "descendant"]);
  });
});

describe("user history department display", () => {
  it("resolves department ids and marks deleted departments", async () => {
    const { repository, db } = await loadUsersRepository();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );
    const insertDepartment = db.prepare(
      `INSERT INTO departments
        (company_id, open_department_id, name, status, deleted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertDepartment.run(companyId, "old-department", "旧部门", "deleted", "2026-01-02", "2026-01-02");
    insertDepartment.run(companyId, "new-department", "新部门", "active", null, "2026-01-03");

    db.prepare(
      `INSERT INTO user_change_events
        (company_id, user_open_id, type, changed_fields_json, before_json, after_json, occurred_at)
       VALUES (?, ?, 'updated', ?, ?, ?, ?)`
    ).run(
      companyId,
      "user-1",
      JSON.stringify(["primaryDepartmentId", "departmentIds"]),
      JSON.stringify({
        primaryDepartmentId: "old-department",
        departmentIds: ["old-department"]
      }),
      JSON.stringify({
        primaryDepartmentId: "new-department",
        departmentIds: ["new-department"]
      }),
      "2026-01-03"
    );

    const [event] = repository.listUserHistory(companyId, "user-1");
    expect(event.before).toMatchObject({
      primaryDepartmentId: "old-department",
      departmentIds: ["old-department"]
    });
    expect(event.after).toMatchObject({
      primaryDepartmentId: "new-department",
      departmentIds: ["new-department"]
    });
    expect(event.beforeDisplay).toMatchObject({
      primaryDepartmentId: "旧部门（已取消）",
      departmentIds: ["旧部门（已取消）"]
    });
    expect(event.afterDisplay).toMatchObject({
      primaryDepartmentId: "新部门",
      departmentIds: ["新部门"]
    });
  });
});
