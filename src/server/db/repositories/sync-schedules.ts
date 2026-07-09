import { getDb } from "@/server/db/connection";

export type CompanySyncSchedule = {
  id: number;
  companyId: number;
  name: string | null;
  cronExpression: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanySyncScheduleInput = {
  name?: string | null;
  cronExpression: string;
  enabled?: boolean;
  nextRunAt?: string | null;
};

export type CompanySyncScheduleUpdate = Partial<CompanySyncScheduleInput>;

type CompanySyncScheduleRow = {
  id: number;
  company_id: number;
  name: string | null;
  cron_expression: string;
  enabled: number;
  last_triggered_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
};

const mapSchedule = (row: CompanySyncScheduleRow): CompanySyncSchedule => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  cronExpression: row.cron_expression,
  enabled: Boolean(row.enabled),
  lastTriggeredAt: row.last_triggered_at,
  nextRunAt: row.next_run_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const listCompanySyncSchedules = (companyId: number) => {
  const rows = getDb()
    .prepare("SELECT * FROM company_sync_schedules WHERE company_id = ? ORDER BY created_at DESC")
    .all(companyId) as CompanySyncScheduleRow[];
  return rows.map(mapSchedule);
};

export const getCompanySyncSchedule = (companyId: number, id: number) => {
  const row = getDb()
    .prepare("SELECT * FROM company_sync_schedules WHERE company_id = ? AND id = ?")
    .get(companyId, id) as CompanySyncScheduleRow | undefined;
  return row ? mapSchedule(row) : null;
};

export const createCompanySyncSchedule = (companyId: number, input: CompanySyncScheduleInput) => {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      `INSERT INTO company_sync_schedules
        (company_id, name, cron_expression, enabled, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      companyId,
      input.name || null,
      input.cronExpression,
      input.enabled === false ? 0 : 1,
      input.nextRunAt || null,
      now,
      now
    );
  return getCompanySyncSchedule(companyId, Number(result.lastInsertRowid));
};

export const updateCompanySyncSchedule = (
  companyId: number,
  id: number,
  input: CompanySyncScheduleUpdate
) => {
  const current = getCompanySyncSchedule(companyId, id);
  if (!current) {
    return null;
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE company_sync_schedules
       SET name = ?, cron_expression = ?, enabled = ?, next_run_at = ?, updated_at = ?
       WHERE company_id = ? AND id = ?`
    )
    .run(
      input.name === undefined ? current.name : input.name || null,
      input.cronExpression ?? current.cronExpression,
      (input.enabled ?? current.enabled) ? 1 : 0,
      input.nextRunAt === undefined ? current.nextRunAt : input.nextRunAt,
      now,
      companyId,
      id
    );
  return getCompanySyncSchedule(companyId, id);
};

export const deleteCompanySyncSchedule = (companyId: number, id: number) => {
  const result = getDb()
    .prepare("DELETE FROM company_sync_schedules WHERE company_id = ? AND id = ?")
    .run(companyId, id);
  return result.changes > 0;
};

export const listDueCompanySyncSchedules = (now: string) => {
  const rows = getDb()
    .prepare(
      `SELECT s.*
       FROM company_sync_schedules s
       INNER JOIN companies c ON c.id = s.company_id
       WHERE s.enabled = 1
         AND c.enabled = 1
         AND (s.next_run_at IS NULL OR s.next_run_at <= ?)
       ORDER BY COALESCE(s.next_run_at, s.created_at) ASC`
    )
    .all(now) as CompanySyncScheduleRow[];
  return rows.map(mapSchedule);
};

export const setCompanySyncScheduleRunTimes = (id: number, lastTriggeredAt: string, nextRunAt: string) => {
  getDb()
    .prepare(
      `UPDATE company_sync_schedules
       SET last_triggered_at = ?, next_run_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(lastTriggeredAt, nextRunAt, new Date().toISOString(), id);
};
