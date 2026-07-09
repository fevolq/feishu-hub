import { getDb } from "@/server/db/connection";

export type CompanyOverviewCard = {
  id: number;
  name: string;
  employeeCount: number;
  recentJoinedCount: number;
  recentResignedCount: number;
};

type CompanyOverviewRow = {
  id: number;
  name: string;
  employee_count: number | null;
  recent_joined_count: number | null;
  recent_resigned_count: number | null;
};

export const listCompanyOverviewCards = (since: string): CompanyOverviewCard[] => {
  const rows = getDb()
    .prepare(
      `SELECT c.id,
              c.name,
              COALESCE(active_users.employee_count, 0) AS employee_count,
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
    recentJoinedCount: Number(row.recent_joined_count || 0),
    recentResignedCount: Number(row.recent_resigned_count || 0)
  }));
};
