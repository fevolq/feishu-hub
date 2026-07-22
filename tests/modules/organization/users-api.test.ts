import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("users route pagination", () => {
  it("returns one database page with total metadata", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-users-route-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
    vi.resetModules();
    vi.doMock("@/modules/auth/server/guards", () => ({
      requireApiAuth: async () => null
    }));

    const { getDb } = await import("@/shared/server/db/connection");
    const db = getDb();
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
    insertUser.run(companyId, "user-1", "User 1", "2026-01-01", "2026-01-01", "2026-01-01");
    insertUser.run(companyId, "user-2", "User 2", "2026-01-02", "2026-01-02", "2026-01-02");
    insertUser.run(companyId, "user-3", "User 3", "2026-01-03", "2026-01-03", "2026-01-03");

    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/api/companies/[id]/users/route");
    const response = await GET(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/users?page=2&pageSize=2`
      ),
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(body.users.map((user: { openId: string }) => user.openId)).toEqual(["user-1"]);
  });
});
