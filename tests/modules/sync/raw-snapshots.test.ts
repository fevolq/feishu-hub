import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadRawSnapshotRepository = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-raw-snapshots-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();

  const repository = await import("@/modules/sync/server/repositories/sync-raw-snapshots");
  const { getDb } = await import("@/shared/server/db/connection");
  return { repository, db: getDb() };
};

describe("sync raw snapshots", () => {
  it("stores one immutable raw payload for each sync run", async () => {
    const { repository, db } = await loadRawSnapshotRepository();
    const companyId = Number(
      db
        .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
        .run("Alpha", "cli_a", "secret_a").lastInsertRowid
    );
    const syncRunId = Number(
      db
        .prepare(
          `INSERT INTO sync_runs (company_id, trigger_type, status, started_at)
           VALUES (?, 'manual', 'running', ?)`
        )
        .run(companyId, "2026-01-01T00:00:00.000Z").lastInsertRowid
    );
    const payload = {
      schemaVersion: 1,
      departmentRequests: [{ pages: [{ response: { code: 0, data: { items: [{ id: "od_1" }] } } }] }],
      userRequests: []
    };

    repository.createSyncRawSnapshot({
      companyId,
      syncRunId,
      payload,
      capturedAt: "2026-01-01T00:01:00.000Z"
    });

    const stored = db
      .prepare(
        `SELECT company_id, sync_run_id, payload_json, captured_at
         FROM sync_raw_snapshots WHERE sync_run_id = ?`
      )
      .get(syncRunId) as {
      company_id: number;
      sync_run_id: number;
      payload_json: string;
      captured_at: string;
    };

    expect(stored).toEqual({
      company_id: companyId,
      sync_run_id: syncRunId,
      payload_json: JSON.stringify(payload),
      captured_at: "2026-01-01T00:01:00.000Z"
    });
    expect(() =>
      repository.createSyncRawSnapshot({
        companyId,
        syncRunId,
        payload: { replaced: true },
        capturedAt: "2026-01-01T00:02:00.000Z"
      })
    ).toThrow();
  });
});
