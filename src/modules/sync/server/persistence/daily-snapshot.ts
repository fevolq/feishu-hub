import type { Statement } from "better-sqlite3";
import type { DailySnapshotRecord } from "@/modules/organization/domain/snapshots";

export const runDailySnapshotUpsert = (
  statement: Statement,
  record: DailySnapshotRecord
) => {
  statement.run(
    record.companyId,
    record.userOpenId,
    record.snapshotDate,
    record.snapshotJson,
    record.status,
    record.name,
    record.email,
    record.jobTitle,
    record.leaderOpenId,
    record.primaryDepartmentId,
    record.departmentIdsJson,
    record.capturedAt,
    record.syncRunId
  );
};
