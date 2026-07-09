import { getDb } from "../connection";

export type SyncTriggerType = "manual" | "schedule";
export type SyncStatus = "running" | "success" | "failed";

export type SyncRunStats = {
  departmentsCount?: number;
  usersCount?: number;
  createdCount?: number;
  updatedCount?: number;
  resignedCount?: number;
  restoredCount?: number;
};

export const startSyncRun = (companyId: number, triggerType: SyncTriggerType) => {
  const result = getDb()
    .prepare(
      `INSERT INTO sync_runs (company_id, trigger_type, status, started_at)
       VALUES (?, ?, 'running', ?)`
    )
    .run(companyId, triggerType, new Date().toISOString());
  return Number(result.lastInsertRowid);
};

export const finishSyncRun = (
  id: number,
  status: Exclude<SyncStatus, "running">,
  stats: SyncRunStats,
  error?: string
) => {
  getDb()
    .prepare(
      `UPDATE sync_runs
       SET status = ?,
           finished_at = ?,
           departments_count = ?,
           users_count = ?,
           created_count = ?,
           updated_count = ?,
           resigned_count = ?,
           restored_count = ?,
           error = ?
       WHERE id = ?`
    )
    .run(
      status,
      new Date().toISOString(),
      stats.departmentsCount || 0,
      stats.usersCount || 0,
      stats.createdCount || 0,
      stats.updatedCount || 0,
      stats.resignedCount || 0,
      stats.restoredCount || 0,
      error || null,
      id
    );
};

export const listRecentSyncRuns = (companyId?: number, limit = 20) => {
  const db = getDb();
  if (companyId) {
    return db
      .prepare("SELECT * FROM sync_runs WHERE company_id = ? ORDER BY started_at DESC LIMIT ?")
      .all(companyId, limit);
  }
  return db.prepare("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT ?").all(limit);
};
