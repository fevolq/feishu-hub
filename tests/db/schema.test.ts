import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadDatabase = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-schema-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();
  return import("@/server/db/connection");
};

describe("database schema", () => {
  it("uses the clean company schema without legacy interval sync columns", async () => {
    const { getDb } = await loadDatabase();
    const columns = getDb()
      .prepare("PRAGMA table_info(companies)")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(columns).toContain("name");
    expect(columns).toContain("app_id");
    expect(columns).toContain("app_secret");
    expect(columns).toContain("enabled");
    expect(columns).toContain("sort_order");
    expect(columns).not.toContain("sync_enabled");
    expect(columns).not.toContain("sync_interval_minutes");
    expect(columns).not.toContain("last_sync_at");
    expect(columns).not.toContain("next_sync_at");
  });
});
