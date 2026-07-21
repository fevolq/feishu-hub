import { getDb } from "../connection";

export type SyncRawSnapshotInput = {
  companyId: number;
  syncRunId: number;
  payload: unknown;
  capturedAt: string;
};

export const createSyncRawSnapshot = (input: SyncRawSnapshotInput) => {
  const result = getDb()
    .prepare(
      `INSERT INTO sync_raw_snapshots
        (company_id, sync_run_id, payload_json, captured_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      input.companyId,
      input.syncRunId,
      JSON.stringify(input.payload),
      input.capturedAt
    );

  return Number(result.lastInsertRowid);
};
