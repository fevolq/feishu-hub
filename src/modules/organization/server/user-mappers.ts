import type { User } from "../domain/types";
import type { StoredUser, UserListItem } from "../contracts";

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

export const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
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

export const rowToUserListItem = (row: CurrentUserRow): UserListItem => ({
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
  updatedAt: row.updated_at,
  resignedAt: row.resigned_at
});

export const rowToStoredUser = (row: CurrentUserRow): StoredUser => ({
  user: rowToUser(row),
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  updatedAt: row.updated_at,
  resignedAt: row.resigned_at
});
