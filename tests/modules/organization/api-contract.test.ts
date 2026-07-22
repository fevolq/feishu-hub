import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadApiFixture = async (prefix: string) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();
  vi.doMock("@/modules/auth/server/guards", () => ({
    requireApiAuth: async () => null
  }));

  const [{ getDb }, departmentsRoute, recentUsersRoute, historyRoute, { NextRequest }] =
    await Promise.all([
      import("@/shared/server/db/connection"),
      import("@/app/api/companies/[id]/departments/route"),
      import("@/app/api/companies/[id]/recent-users/route"),
      import("@/app/api/users/[id]/history/route"),
      import("next/server")
    ]);
  const db = getDb();
  const companyId = Number(
    db
      .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
      .run("Organization Contract Co", "cli_org", "secret").lastInsertRowid
  );

  return { db, companyId, departmentsRoute, recentUsersRoute, historyRoute, NextRequest };
};

type ContractDb = Awaited<ReturnType<typeof loadApiFixture>>["db"];

const insertDepartment = (
  db: ContractDb,
  companyId: number,
  id: string,
  parentId: string | null,
  name: string
) => {
  db.prepare(
    `INSERT INTO departments
      (company_id, open_department_id, parent_open_department_id, name, extra_json, updated_at)
     VALUES (?, ?, ?, ?, '{}', ?)`
  ).run(companyId, id, parentId, name, "2026-01-01T00:00:00.000Z");
};

const insertUser = (
  db: ContractDb,
  companyId: number,
  openId: string,
  name: string,
  departmentId: string,
  updatedAt: string
) => {
  db.prepare(
    `INSERT INTO users_current
      (company_id, open_id, name, primary_department_id, department_ids_json,
       extra_json, first_seen_at, last_seen_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?)`
  ).run(
    companyId,
    openId,
    name,
    departmentId,
    JSON.stringify([departmentId]),
    updatedAt,
    updatedAt,
    updatedAt
  );
  db.prepare(
    `INSERT INTO user_departments (company_id, user_open_id, open_department_id)
     VALUES (?, ?, ?)`
  ).run(companyId, openId, departmentId);
};

const insertEvent = (
  db: ContractDb,
  companyId: number,
  openId: string,
  type: "created" | "updated" | "resigned" | "restored",
  occurredAt: string
) => {
  db.prepare(
    `INSERT INTO user_change_events
      (company_id, user_open_id, type, changed_fields_json, before_json, after_json, occurred_at)
     VALUES (?, ?, ?, '["name"]', NULL, ?, ?)`
  ).run(companyId, openId, type, JSON.stringify({ openId, name: `${openId}-${type}` }), occurredAt);
};

describe("organization query API contract", () => {
  it("returns the department tree and paginates direct and descendant employees", async () => {
    const { db, companyId, departmentsRoute, NextRequest } = await loadApiFixture(
      "feishu-departments-api-contract-"
    );
    insertDepartment(db, companyId, "root", null, "Root");
    insertDepartment(db, companyId, "eng", "root", "Engineering");
    insertDepartment(db, companyId, "frontend", "eng", "Frontend");
    insertDepartment(db, companyId, "quality", "eng", "Quality");
    insertDepartment(db, companyId, "sales", "root", "Sales");

    insertUser(db, companyId, "u-eng", "Engineering Direct", "eng", "2026-01-05T00:00:00.000Z");
    insertUser(db, companyId, "u-front-1", "Frontend One", "frontend", "2026-01-04T00:00:00.000Z");
    insertUser(db, companyId, "u-front-2", "Frontend Two", "frontend", "2026-01-03T00:00:00.000Z");
    insertUser(db, companyId, "u-quality", "Quality One", "quality", "2026-01-02T00:00:00.000Z");

    const context = { params: Promise.resolve({ id: String(companyId) }) };
    const treeResponse = await departmentsRoute.GET(
      new NextRequest(`http://example.com/api/companies/${companyId}/departments`),
      context
    );
    expect(treeResponse.status).toBe(200);
    expect(await treeResponse.json()).toEqual({
      tree: [
        {
          key: "root",
          title: "Root",
          children: [
            {
              key: "eng",
              title: "Engineering",
              children: [
                { key: "frontend", title: "Frontend", children: [] },
                { key: "quality", title: "Quality", children: [] }
              ]
            },
            { key: "sales", title: "Sales", children: [] }
          ]
        }
      ],
      users: [],
      pagination: { page: 1, pageSize: 20, total: 0 }
    });

    const directResponse = await departmentsRoute.GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/departments?departmentId=eng&scope=direct&page=1&pageSize=2`
      ),
      context
    );
    const directBody = await directResponse.json();
    expect(directResponse.status).toBe(200);
    expect(directBody.pagination).toEqual({ page: 1, pageSize: 2, total: 1 });
    expect(directBody.users.map((user: { openId: string }) => user.openId)).toEqual(["u-eng"]);
    expect(directBody).not.toHaveProperty("tree");

    const descendantResponse = await departmentsRoute.GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/departments?departmentId=eng&scope=descendant&page=2&pageSize=2`
      ),
      context
    );
    const descendantBody = await descendantResponse.json();
    expect(descendantResponse.status).toBe(200);
    expect(descendantBody.pagination).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(descendantBody.users.map((user: { openId: string }) => user.openId)).toEqual([
      "u-quality"
    ]);
    expect(descendantBody.users.map((user: { openId: string }) => user.openId)).not.toContain(
      "u-eng"
    );

    const invalidPaginationResponse = await departmentsRoute.GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/departments?departmentId=eng&page=0`
      ),
      context
    );
    expect(invalidPaginationResponse.status).toBe(400);
    expect(await invalidPaginationResponse.json()).toEqual({ error: expect.any(String) });
  });

  it("returns stable pagination envelopes for recent users and user history", async () => {
    const { db, companyId, recentUsersRoute, historyRoute, NextRequest } = await loadApiFixture(
      "feishu-history-api-contract-"
    );
    insertDepartment(db, companyId, "root", null, "Root");
    insertUser(db, companyId, "u-1", "User One", "root", "2026-01-04T00:00:00.000Z");
    insertUser(db, companyId, "u-2", "User Two", "root", "2026-01-03T00:00:00.000Z");
    insertUser(db, companyId, "u-3", "User Three", "root", "2026-01-02T00:00:00.000Z");

    insertEvent(db, companyId, "u-1", "created", "2026-01-04T00:00:00.000Z");
    insertEvent(db, companyId, "u-2", "restored", "2026-01-03T00:00:00.000Z");
    insertEvent(db, companyId, "u-3", "created", "2026-01-02T00:00:00.000Z");
    insertEvent(db, companyId, "u-1", "updated", "2026-01-03T12:00:00.000Z");
    insertEvent(db, companyId, "u-1", "updated", "2026-01-02T12:00:00.000Z");

    const recentResponse = await recentUsersRoute.GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/recent-users?type=joined&since=2026-01-01T00%3A00%3A00.000Z&page=2&pageSize=2`
      ),
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    const recentBody = await recentResponse.json();
    expect(recentResponse.status).toBe(200);
    expect(recentBody.pagination).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(recentBody.users.map((user: { openId: string }) => user.openId)).toEqual(["u-3"]);
    expect(recentBody.users[0]).toEqual(
      expect.objectContaining({
        openId: "u-3",
        activityAt: "2026-01-02T00:00:00.000Z"
      })
    );

    const historyResponse = await historyRoute.GET(
      new NextRequest(
        `http://example.com/api/users/u-1/history?companyId=${companyId}&page=2&pageSize=2`
      ),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    const historyBody = await historyResponse.json();
    expect(historyResponse.status).toBe(200);
    expect(historyBody.pagination).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(historyBody.events).toHaveLength(1);
    expect(historyBody.events[0]).toEqual(
      expect.objectContaining({
        type: "updated",
        changedFields: ["name"],
        occurredAt: "2026-01-02T12:00:00.000Z"
      })
    );

    const invalidRecentResponse = await recentUsersRoute.GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/recent-users?type=unknown&since=2026-01-01T00%3A00%3A00.000Z`
      ),
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    expect(invalidRecentResponse.status).toBe(400);
    expect(await invalidRecentResponse.json()).toEqual({ error: expect.any(String) });
  });
});
