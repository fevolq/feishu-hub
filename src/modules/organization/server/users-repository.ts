import { getDb } from "@/shared/server/db/connection";
import {
  getPaginationOffset,
  type PaginatedResult,
  type PaginationParams
} from "@/shared/contracts/pagination";
import type { UserListFilters, UserListItem } from "../contracts";
import {
  rowToStoredUser,
  rowToUserListItem,
  type CurrentUserRow
} from "./user-mappers";

export const listCurrentUsersForCompany = (companyId: number) => {
  const rows = getDb()
    .prepare("SELECT * FROM users_current WHERE company_id = ?")
    .all(companyId) as CurrentUserRow[];
  return rows.map(rowToStoredUser);
};

export const getCurrentUsersMap = (companyId: number) => {
  return new Map(listCurrentUsersForCompany(companyId).map((item) => [item.user.openId, item]));
};

const buildUserListWhere = (companyId: number, filters: UserListFilters) => {
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

  return { where: clauses.join(" AND "), params };
};

const selectUserListRows = (
  where: string,
  params: Array<string | number>,
  pagination?: PaginationParams
) => {
  const limitClause = pagination ? " LIMIT ? OFFSET ?" : "";
  const queryParams = pagination
    ? [...params, pagination.pageSize, getPaginationOffset(pagination)]
    : params;

  return getDb()
    .prepare(
      `SELECT u.*, d.name AS department_name, d.status AS department_status, leader.name AS leader_name
       FROM users_current u
       LEFT JOIN departments d
         ON d.company_id = u.company_id AND d.open_department_id = u.primary_department_id
       LEFT JOIN users_current leader
         ON leader.company_id = u.company_id AND leader.open_id = u.leader_open_id
       WHERE ${where}
       ORDER BY u.updated_at DESC, u.id DESC${limitClause}`
    )
    .all(...queryParams) as CurrentUserRow[];
};

export const listUsers = (companyId: number, filters: UserListFilters = {}): UserListItem[] => {
  const { where, params } = buildUserListWhere(companyId, filters);
  return selectUserListRows(where, params).map(rowToUserListItem);
};

export const listUsersPage = (
  companyId: number,
  filters: UserListFilters,
  pagination: PaginationParams
): PaginatedResult<UserListItem> => {
  const { where, params } = buildUserListWhere(companyId, filters);
  const { total } = getDb()
    .prepare(`SELECT COUNT(*) AS total FROM users_current u WHERE ${where}`)
    .get(...params) as { total: number };
  const items = selectUserListRows(where, params, pagination).map(rowToUserListItem);

  return { items, total, ...pagination };
};
