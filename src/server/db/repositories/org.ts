import { getDb } from "../connection";
import type { Department, User } from "../../org/types";
import { diffExtraFields } from "../../org/diff";

export type CurrentUserRow = {
  id: number;
  company_id: number;
  open_id: string;
  union_id: string | null;
  name: string;
  email: string | null;
  job_title: string | null;
  leader_open_id: string | null;
  primary_department_id: string | null;
  department_ids_json: string;
  avatar_url: string | null;
  mobile: string | null;
  status: "active" | "resigned";
  extra_json: string;
  first_seen_at: string;
  last_seen_at: string;
  resigned_at: string | null;
  updated_at: string;
  department_name?: string | null;
  department_status?: "active" | "deleted" | null;
  leader_name?: string | null;
};

export type UserListFilters = {
  status?: "all" | "active" | "resigned";
  departmentId?: string;
  departmentIds?: string[];
  query?: string;
};

export type UserListItem = {
  id: number;
  openId: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  jobTitle: string | null;
  leaderOpenId: string | null;
  leaderName: string | null;
  primaryDepartmentId: string | null;
  departmentName: string | null;
  departmentStatus: "active" | "deleted" | null;
  status: "active" | "resigned";
  lastSeenAt: string;
  resignedAt: string | null;
};

export type DepartmentListFilters = {
  includeDeleted?: boolean;
};

export type DepartmentListItem = Department & {
  status: "active" | "deleted";
  deletedAt: string | null;
};

export type StoredUser = {
  user: User;
  firstSeenAt: string;
  lastSeenAt: string;
  resignedAt: string | null;
};

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getExtraFromSnapshot = (snapshot: Record<string, unknown> | null) => {
  const extra = snapshot?.extra;
  return extra && typeof extra === "object" && !Array.isArray(extra) ? (extra as Record<string, unknown>) : null;
};

const expandHistoryChangedFields = (
  changedFields: string[],
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
) => {
  return changedFields.flatMap((field) => {
    if (field !== "extra") {
      return [field];
    }

    const extraFields = diffExtraFields(getExtraFromSnapshot(before), getExtraFromSnapshot(after));
    return extraFields.length ? extraFields : [field];
  });
};

export const formatDepartmentDisplayName = (
  name: string | null | undefined,
  status: "active" | "deleted" | null | undefined
) => {
  if (!name) return null;
  return status === "deleted" ? `${name}（已取消）` : name;
};

export const rowToUser = (row: CurrentUserRow): User => ({
  openId: row.open_id,
  unionId: row.union_id,
  name: row.name,
  email: row.email,
  jobTitle: row.job_title,
  leaderOpenId: row.leader_open_id,
  primaryDepartmentId: row.primary_department_id,
  departmentIds: parseJson<string[]>(row.department_ids_json, []),
  avatarUrl: row.avatar_url,
  mobile: row.mobile,
  status: row.status,
  extra: parseJson<Record<string, unknown>>(row.extra_json, {})
});

const rowToStoredUser = (row: CurrentUserRow): StoredUser => ({
  user: rowToUser(row),
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  resignedAt: row.resigned_at
});

export const listCurrentUsersForCompany = (companyId: number) => {
  const rows = getDb()
    .prepare("SELECT * FROM users_current WHERE company_id = ?")
    .all(companyId) as CurrentUserRow[];
  return rows.map(rowToStoredUser);
};

export const getCurrentUsersMap = (companyId: number) => {
  return new Map(listCurrentUsersForCompany(companyId).map((item) => [item.user.openId, item]));
};

export const listUsers = (companyId: number, filters: UserListFilters = {}): UserListItem[] => {
  const clauses = ["u.company_id = ?"];
  const params: Array<string | number> = [companyId];

  if (filters.status === "active" || filters.status === "resigned") {
    clauses.push("u.status = ?");
    params.push(filters.status);
  } else if (filters.status !== "all") {
    clauses.push("u.status = 'active'");
  }

  if (filters.departmentId) {
    clauses.push(
      "EXISTS (SELECT 1 FROM user_departments ud WHERE ud.company_id = u.company_id AND ud.user_open_id = u.open_id AND ud.open_department_id = ?)"
    );
    params.push(filters.departmentId);
  }

  if (filters.departmentIds?.length) {
    const placeholders = filters.departmentIds.map(() => "?").join(", ");
    clauses.push(
      `EXISTS (SELECT 1 FROM user_departments ud WHERE ud.company_id = u.company_id AND ud.user_open_id = u.open_id AND ud.open_department_id IN (${placeholders}))`
    );
    params.push(...filters.departmentIds);
  }

  if (filters.query) {
    clauses.push("(u.name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)");
    const keyword = `%${filters.query}%`;
    params.push(keyword, keyword, keyword);
  }

  const rows = getDb()
    .prepare(
      `SELECT u.*, d.name AS department_name, d.status AS department_status, leader.name AS leader_name
       FROM users_current u
       LEFT JOIN departments d
         ON d.company_id = u.company_id AND d.open_department_id = u.primary_department_id
       LEFT JOIN users_current leader
         ON leader.company_id = u.company_id AND leader.open_id = u.leader_open_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY u.status ASC, u.name ASC`
    )
    .all(...params) as CurrentUserRow[];

  return rows.map((row) => ({
    id: row.id,
    openId: row.open_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    email: row.email,
    jobTitle: row.job_title,
    leaderOpenId: row.leader_open_id,
    leaderName: row.leader_name || null,
    primaryDepartmentId: row.primary_department_id,
    departmentName: formatDepartmentDisplayName(row.department_name, row.department_status),
    departmentStatus: row.department_status || null,
    status: row.status,
    lastSeenAt: row.last_seen_at,
    resignedAt: row.resigned_at
  }));
};

export const listDepartments = (companyId: number, filters: DepartmentListFilters = {}): DepartmentListItem[] => {
  const clauses = ["company_id = ?"];
  const params: Array<string | number> = [companyId];

  if (!filters.includeDeleted) {
    clauses.push("status = 'active'");
  }

  return getDb()
    .prepare(
      `SELECT open_department_id AS openDepartmentId,
              parent_open_department_id AS parentOpenDepartmentId,
              name,
              status,
              deleted_at AS deletedAt,
              extra_json AS extraJson
       FROM departments
       WHERE ${clauses.join(" AND ")}
       ORDER BY status ASC, name ASC`
    )
    .all(...params)
    .map((row) => {
      const item = row as {
        openDepartmentId: string;
        parentOpenDepartmentId: string | null;
        name: string;
        status: "active" | "deleted";
        deletedAt: string | null;
        extraJson: string;
      };
      return {
        openDepartmentId: item.openDepartmentId,
        parentOpenDepartmentId: item.parentOpenDepartmentId,
        name: item.name,
        status: item.status,
        deletedAt: item.deletedAt,
        extra: parseJson<Record<string, unknown>>(item.extraJson, {})
      };
    });
};

export const listUserHistory = (companyId: number, openId: string) => {
  return getDb()
    .prepare(
      `SELECT id, type, changed_fields_json, before_json, after_json, occurred_at
       FROM user_change_events
       WHERE company_id = ? AND user_open_id = ?
       ORDER BY occurred_at DESC, id DESC`
    )
    .all(companyId, openId)
    .map((row) => {
      const item = row as {
        id: number;
        type: string;
        changed_fields_json: string;
        before_json: string | null;
        after_json: string | null;
        occurred_at: string;
      };
      const before = item.before_json ? parseJson<Record<string, unknown>>(item.before_json, {}) : null;
      const after = item.after_json ? parseJson<Record<string, unknown>>(item.after_json, {}) : null;
      const changedFields = parseJson<string[]>(item.changed_fields_json, []);

      return {
        id: item.id,
        type: item.type,
        changedFields: expandHistoryChangedFields(changedFields, before, after),
        before,
        after,
        occurredAt: item.occurred_at
      };
    });
};

export const replaceDepartments = (companyId: number, departments: Department[], occurredAt: string) => {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO departments
      (company_id, open_department_id, parent_open_department_id, name, status, deleted_at, extra_json, updated_at)
     VALUES (?, ?, ?, ?, 'active', NULL, ?, ?)
     ON CONFLICT(company_id, open_department_id) DO UPDATE SET
       parent_open_department_id = excluded.parent_open_department_id,
       name = excluded.name,
       status = 'active',
       deleted_at = NULL,
       extra_json = excluded.extra_json,
       updated_at = excluded.updated_at`
  );

  for (const department of departments) {
    upsert.run(
      companyId,
      department.openDepartmentId,
      department.parentOpenDepartmentId,
      department.name,
      JSON.stringify(department.extra),
      occurredAt
    );
  }

  if (!departments.length) {
    db.prepare(
      `UPDATE departments
       SET status = 'deleted',
           deleted_at = COALESCE(deleted_at, ?),
           updated_at = ?
       WHERE company_id = ? AND status = 'active'`
    ).run(occurredAt, occurredAt, companyId);
    return;
  }

  const placeholders = departments.map(() => "?").join(", ");
  db.prepare(
    `UPDATE departments
     SET status = 'deleted',
         deleted_at = COALESCE(deleted_at, ?),
         updated_at = ?
     WHERE company_id = ?
       AND status = 'active'
       AND open_department_id NOT IN (${placeholders})`
  ).run(occurredAt, occurredAt, companyId, ...departments.map((item) => item.openDepartmentId));
};
