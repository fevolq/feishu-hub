import { getDb } from "../connection";
import {
  rowToUserListItem,
  type CurrentUserRow,
  type UserListItem
} from "./org";

export type RecentActivityType = "joined" | "resigned";

export type RecentCompanyUser = UserListItem & {
  activityAt: string;
};

export type CompanyOverviewCard = {
  id: number;
  name: string;
  employeeCount: number;
  historyCount: number;
  recentJoinedCount: number;
  recentResignedCount: number;
};

type CompanyOverviewRow = {
  id: number;
  name: string;
  employee_count: number | null;
  history_count: number | null;
  recent_joined_count: number | null;
  recent_resigned_count: number | null;
};

export const listCompanyOverviewCards = (since: string): CompanyOverviewCard[] => {
  const rows = getDb()
    .prepare(
      `SELECT c.id,
              c.name,
              COALESCE(active_users.employee_count, 0) AS employee_count,
              COALESCE(history_events.history_count, 0) AS history_count,
              COALESCE(recent_events.recent_joined_count, 0) AS recent_joined_count,
              COALESCE(recent_events.recent_resigned_count, 0) AS recent_resigned_count
       FROM companies c
       LEFT JOIN (
         SELECT company_id,
                COUNT(*) AS employee_count
         FROM users_current
         WHERE status = 'active'
         GROUP BY company_id
       ) active_users
         ON active_users.company_id = c.id
       LEFT JOIN (
         SELECT company_id,
                COUNT(*) AS history_count
         FROM user_change_events
         GROUP BY company_id
       ) history_events
         ON history_events.company_id = c.id
       LEFT JOIN (
         SELECT company_id,
                COUNT(DISTINCT CASE WHEN type IN ('created', 'restored') THEN user_open_id END) AS recent_joined_count,
                COUNT(DISTINCT CASE WHEN type = 'resigned' THEN user_open_id END) AS recent_resigned_count
         FROM user_change_events
         WHERE occurred_at >= ?
           AND type IN ('created', 'restored', 'resigned')
         GROUP BY company_id
       ) recent_events
         ON recent_events.company_id = c.id
       ORDER BY c.sort_order ASC, c.created_at DESC, c.id ASC`
    )
    .all(since) as CompanyOverviewRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    employeeCount: Number(row.employee_count || 0),
    historyCount: Number(row.history_count || 0),
    recentJoinedCount: Number(row.recent_joined_count || 0),
    recentResignedCount: Number(row.recent_resigned_count || 0)
  }));
};

export const listRecentCompanyUsers = (
  companyId: number,
  type: RecentActivityType,
  since: string
): RecentCompanyUser[] => {
  const eventTypes = type === "joined" ? ["created", "restored"] : ["resigned"];
  const placeholders = eventTypes.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `WITH recent_users AS (
         SELECT user_open_id, MAX(occurred_at) AS activity_at
         FROM user_change_events
         WHERE company_id = ?
           AND occurred_at >= ?
           AND type IN (${placeholders})
         GROUP BY user_open_id
       )
       SELECT u.*, d.name AS department_name, d.status AS department_status,
              leader.name AS leader_name, recent_users.activity_at
       FROM recent_users
       INNER JOIN users_current u
         ON u.company_id = ? AND u.open_id = recent_users.user_open_id
       LEFT JOIN departments d
         ON d.company_id = u.company_id AND d.open_department_id = u.primary_department_id
       LEFT JOIN users_current leader
         ON leader.company_id = u.company_id AND leader.open_id = u.leader_open_id
       ORDER BY recent_users.activity_at DESC, u.id DESC`
    )
    .all(companyId, since, ...eventTypes, companyId) as Array<CurrentUserRow & { activity_at: string }>;

  return rows.map((row) => ({
    ...rowToUserListItem(row),
    activityAt: row.activity_at
  }));
};
