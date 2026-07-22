import { getDb } from "@/shared/server/db/connection";
import type { CompanyInput, CompanyLatestSyncRun, PublicCompany } from "../contracts";

export type CompanyEntity = {
  id: number;
  name: string;
  appId: string;
  appSecret: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  latestSyncRun: CompanyLatestSyncRun | null;
};

type CompanyRow = {
  id: number;
  name: string;
  app_id: string;
  app_secret: string;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  latest_sync_id?: number | null;
  latest_sync_trigger_type?: string | null;
  latest_sync_status?: string | null;
  latest_sync_started_at?: string | null;
  latest_sync_finished_at?: string | null;
  latest_sync_departments_count?: number | null;
  latest_sync_users_count?: number | null;
  latest_sync_created_count?: number | null;
  latest_sync_updated_count?: number | null;
  latest_sync_resigned_count?: number | null;
  latest_sync_restored_count?: number | null;
  latest_sync_error?: string | null;
};

const mapCompany = (row: CompanyRow): CompanyEntity => ({
  id: row.id,
  name: row.name,
  appId: row.app_id,
  appSecret: row.app_secret,
  enabled: Boolean(row.enabled),
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  latestSyncRun: row.latest_sync_id
    ? {
        id: row.latest_sync_id,
        triggerType: row.latest_sync_trigger_type || "",
        status: row.latest_sync_status || "",
        startedAt: row.latest_sync_started_at || "",
        finishedAt: row.latest_sync_finished_at || null,
        departmentsCount: row.latest_sync_departments_count || 0,
        usersCount: row.latest_sync_users_count || 0,
        createdCount: row.latest_sync_created_count || 0,
        updatedCount: row.latest_sync_updated_count || 0,
        resignedCount: row.latest_sync_resigned_count || 0,
        restoredCount: row.latest_sync_restored_count || 0,
        error: row.latest_sync_error || null
      }
    : null
});

export const toPublicCompany = (company: CompanyEntity): PublicCompany => ({
  id: company.id,
  name: company.name,
  appId: company.appId,
  enabled: company.enabled,
  sortOrder: company.sortOrder,
  latestSyncRun: company.latestSyncRun
});

export const toPublicCompanies = (companies: CompanyEntity[]): PublicCompany[] =>
  companies.map(toPublicCompany);

const companySelectWithLatestRun = `
  SELECT c.*,
         sr.id AS latest_sync_id,
         sr.trigger_type AS latest_sync_trigger_type,
         sr.status AS latest_sync_status,
         sr.started_at AS latest_sync_started_at,
         sr.finished_at AS latest_sync_finished_at,
         sr.departments_count AS latest_sync_departments_count,
         sr.users_count AS latest_sync_users_count,
         sr.created_count AS latest_sync_created_count,
         sr.updated_count AS latest_sync_updated_count,
         sr.resigned_count AS latest_sync_resigned_count,
         sr.restored_count AS latest_sync_restored_count,
         sr.error AS latest_sync_error
  FROM companies c
  LEFT JOIN sync_runs sr
    ON sr.id = (
      SELECT id FROM sync_runs
      WHERE company_id = c.id
      ORDER BY started_at DESC
      LIMIT 1
    )
`;

export const listCompanies = () => {
  const rows = getDb()
    .prepare(`${companySelectWithLatestRun} ORDER BY c.sort_order ASC, c.created_at DESC, c.id ASC`)
    .all() as CompanyRow[];
  return rows.map(mapCompany);
};

export const getCompany = (id: number) => {
  const row = getDb()
    .prepare(`${companySelectWithLatestRun} WHERE c.id = ?`)
    .get(id) as CompanyRow | undefined;
  return row ? mapCompany(row) : null;
};

export const createCompany = (input: CompanyInput) => {
  const now = new Date().toISOString();
  const db = getDb();
  const { next_sort_order: nextSortOrder } = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM companies")
    .get() as { next_sort_order: number };
  const result = db
    .prepare(
      `INSERT INTO companies
        (name, app_id, app_secret, enabled, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.appId,
      input.appSecret,
      input.enabled === false ? 0 : 1,
      nextSortOrder,
      now,
      now
    );
  return getCompany(Number(result.lastInsertRowid));
};

export const updateCompany = (id: number, input: Partial<CompanyInput>) => {
  const current = getCompany(id);
  if (!current) {
    return null;
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE companies
       SET name = ?, app_id = ?, app_secret = ?, enabled = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.name ?? current.name,
      input.appId ?? current.appId,
      input.appSecret ?? current.appSecret,
      (input.enabled ?? current.enabled) ? 1 : 0,
      now,
      id
    );
  return getCompany(id);
};

export const updateCompanySortOrder = (companyIds: number[]) => {
  const db = getDb();
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM companies").get() as { total: number };
  if (!companyIds.length && total === 0) {
    return listCompanies();
  }

  const uniqueIds = new Set(companyIds);
  if (uniqueIds.size !== companyIds.length) {
    throw new Error("公司排序中存在重复公司");
  }

  if (!companyIds.length) {
    throw new Error("公司排序必须包含全部公司");
  }

  const placeholders = companyIds.map(() => "?").join(", ");
  const existingRows = db
    .prepare(`SELECT id FROM companies WHERE id IN (${placeholders})`)
    .all(...companyIds) as Array<{ id: number }>;
  if (existingRows.length !== companyIds.length) {
    throw new Error("公司排序中包含不存在的公司");
  }

  if (companyIds.length !== total) {
    throw new Error("公司排序必须包含全部公司");
  }

  const now = new Date().toISOString();
  const updateSortOrder = db.prepare("UPDATE companies SET sort_order = ?, updated_at = ? WHERE id = ?");
  const applyOrder = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => updateSortOrder.run(index, now, id));
  });
  applyOrder(companyIds);
  return listCompanies();
};
