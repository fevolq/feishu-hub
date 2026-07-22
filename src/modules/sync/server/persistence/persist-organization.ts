import { diffUserSnapshots } from "@/modules/organization/domain/diff";
import {
  buildDailySnapshotRecord,
  toSnapshotDate
} from "@/modules/organization/domain/snapshots";
import type { User } from "@/modules/organization/domain/types";
import {
  getCurrentUsersMap,
  replaceDepartments
} from "@/modules/organization/server";
import { getDb } from "@/shared/server/db/connection";
import { appConfig } from "@/shared/server/config";
import { runDailySnapshotUpsert } from "./daily-snapshot";
import type { PersistSnapshotInput, PersistSnapshotStats } from "./types";

export type { PersistSnapshotInput, PersistSnapshotStats } from "./types";

export const persistOrgSnapshot = (input: PersistSnapshotInput): PersistSnapshotStats => {
  const db = getDb();
  const previousUsers = getCurrentUsersMap(input.companyId);
  const nextUsers = new Map(input.users.map((user) => [user.openId, { ...user, status: "active" as const }]));
  const snapshotDate = toSnapshotDate(input.occurredAt, appConfig.timezone);
  const stats: PersistSnapshotStats = {
    departmentsCount: input.departments.length,
    usersCount: input.users.length,
    createdCount: 0,
    updatedCount: 0,
    resignedCount: 0,
    restoredCount: 0
  };

  const tx = db.transaction(() => {
    replaceDepartments(input.companyId, input.departments, input.occurredAt);
    db.prepare("DELETE FROM user_departments WHERE company_id = ?").run(input.companyId);

    const upsertUser = db.prepare(
      `INSERT INTO users_current
        (company_id, open_id, union_id, name, email, job_title, leader_open_id,
         primary_department_id, department_ids_json, avatar_url, mobile, status,
         extra_json, first_seen_at, last_seen_at, resigned_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(company_id, open_id) DO UPDATE SET
         union_id = excluded.union_id,
         name = excluded.name,
         email = excluded.email,
         job_title = excluded.job_title,
         leader_open_id = excluded.leader_open_id,
         primary_department_id = excluded.primary_department_id,
         department_ids_json = excluded.department_ids_json,
         avatar_url = excluded.avatar_url,
         mobile = excluded.mobile,
         status = excluded.status,
         extra_json = excluded.extra_json,
         last_seen_at = excluded.last_seen_at,
         resigned_at = excluded.resigned_at,
         updated_at = excluded.updated_at`
    );
    const insertMembership = db.prepare(
      `INSERT OR IGNORE INTO user_departments (company_id, user_open_id, open_department_id)
       VALUES (?, ?, ?)`
    );
    const insertEvent = db.prepare(
      `INSERT INTO user_change_events
        (company_id, user_open_id, type, changed_fields_json, before_json, after_json, occurred_at, sync_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const upsertDailySnapshot = db.prepare(
      `INSERT INTO user_daily_snapshots
        (company_id, user_open_id, snapshot_date, snapshot_json, status, name, email,
         job_title, leader_open_id, primary_department_id, department_ids_json, captured_at, sync_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(company_id, user_open_id, snapshot_date) DO UPDATE SET
         snapshot_json = excluded.snapshot_json,
         status = excluded.status,
         name = excluded.name,
         email = excluded.email,
         job_title = excluded.job_title,
         leader_open_id = excluded.leader_open_id,
         primary_department_id = excluded.primary_department_id,
         department_ids_json = excluded.department_ids_json,
         captured_at = excluded.captured_at,
         sync_run_id = excluded.sync_run_id`
    );
    const markResigned = db.prepare(
      `UPDATE users_current
       SET status = 'resigned', resigned_at = ?, updated_at = ?
       WHERE company_id = ? AND open_id = ?`
    );

    for (const user of nextUsers.values()) {
      const previousRecord = previousUsers.get(user.openId);
      const previous = previousRecord?.user || null;
      const diff = diffUserSnapshots(previous, user);
      const updatedAt = diff ? input.occurredAt : previousRecord?.updatedAt || input.occurredAt;
      if (diff) {
        if (diff.type === "created") stats.createdCount += 1;
        if (diff.type === "updated") stats.updatedCount += 1;
        if (diff.type === "restored") stats.restoredCount += 1;
        insertEvent.run(
          input.companyId,
          user.openId,
          diff.type,
          JSON.stringify(diff.changedFields),
          diff.before ? JSON.stringify(diff.before) : null,
          diff.after ? JSON.stringify(diff.after) : null,
          input.occurredAt,
          input.syncRunId
        );
      }

      const firstSeenAt = previousRecord?.firstSeenAt || input.occurredAt;
      upsertUser.run(
        input.companyId,
        user.openId,
        user.unionId,
        user.name,
        user.email,
        user.jobTitle,
        user.leaderOpenId,
        user.primaryDepartmentId,
        JSON.stringify(user.departmentIds),
        user.avatarUrl,
        user.mobile,
        "active",
        JSON.stringify(user.extra),
        firstSeenAt,
        input.occurredAt,
        null,
        updatedAt
      );
      runDailySnapshotUpsert(
        upsertDailySnapshot,
        buildDailySnapshotRecord({
          companyId: input.companyId,
          user,
          snapshotDate,
          capturedAt: input.occurredAt,
          syncRunId: input.syncRunId
        })
      );

      for (const deptId of user.departmentIds) {
        insertMembership.run(input.companyId, user.openId, deptId);
      }
    }

    for (const previousRecord of previousUsers.values()) {
      const previous = previousRecord.user;
      if (previous.status !== "active" || nextUsers.has(previous.openId)) {
        continue;
      }
      const diff = diffUserSnapshots(previous, null);
      if (!diff) {
        continue;
      }
      stats.resignedCount += 1;
      const resignedUser: User = { ...previous, status: "resigned" };
      markResigned.run(input.occurredAt, input.occurredAt, input.companyId, previous.openId);
      runDailySnapshotUpsert(
        upsertDailySnapshot,
        buildDailySnapshotRecord({
          companyId: input.companyId,
          user: resignedUser,
          snapshotDate,
          capturedAt: input.occurredAt,
          syncRunId: input.syncRunId
        })
      );
      insertEvent.run(
        input.companyId,
        previous.openId,
        diff.type,
        JSON.stringify(diff.changedFields),
        diff.before ? JSON.stringify(diff.before) : null,
        diff.after ? JSON.stringify(diff.after) : null,
        input.occurredAt,
        input.syncRunId
      );
    }
  });

  tx();
  return stats;
};
