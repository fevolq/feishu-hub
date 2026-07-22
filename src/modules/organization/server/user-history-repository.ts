import { getDb } from "@/shared/server/db/connection";
import {
  getPaginationOffset,
  type PaginatedResult,
  type PaginationParams
} from "@/shared/contracts/pagination";
import { diffExtraFields } from "../domain/diff";
import type { HistoryEvent } from "../contracts";
import { formatDepartmentDisplayName, parseJson } from "./user-mappers";

type UserHistoryRow = {
  id: number;
  type: string;
  changed_fields_json: string;
  before_json: string | null;
  after_json: string | null;
  occurred_at: string;
};

const getExtraFromSnapshot = (snapshot: Record<string, unknown> | null) => {
  const extra = snapshot?.extra;
  return extra && typeof extra === "object" && !Array.isArray(extra)
    ? (extra as Record<string, unknown>)
    : null;
};

const expandHistoryChangedFields = (
  changedFields: string[],
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
) => changedFields.flatMap((field) => {
  if (field !== "extra") return [field];
  const extraFields = diffExtraFields(getExtraFromSnapshot(before), getExtraFromSnapshot(after));
  return extraFields.length ? extraFields : [field];
});

const getDepartmentDisplayNames = (companyId: number) => {
  const rows = getDb()
    .prepare(
      `SELECT open_department_id, name, status
       FROM departments
       WHERE company_id = ?`
    )
    .all(companyId) as Array<{
    open_department_id: string;
    name: string;
    status: "active" | "deleted";
  }>;

  return new Map(
    rows.map((row) => [
      row.open_department_id,
      formatDepartmentDisplayName(row.name, row.status) || row.open_department_id
    ])
  );
};

const formatHistoryDepartmentId = (value: unknown, departmentNames: Map<string, string>) => {
  if (typeof value !== "string" || !value) return value;
  return departmentNames.get(value) || `未知部门（${value}）`;
};

const formatHistoryDepartmentSnapshot = (
  snapshot: Record<string, unknown> | null,
  departmentNames: Map<string, string>
) => {
  if (!snapshot) return null;

  const formatted = { ...snapshot };
  formatted.primaryDepartmentId = formatHistoryDepartmentId(
    snapshot.primaryDepartmentId,
    departmentNames
  );

  if (Array.isArray(snapshot.departmentIds)) {
    formatted.departmentIds = snapshot.departmentIds.map((departmentId) =>
      formatHistoryDepartmentId(departmentId, departmentNames)
    );
  }

  return formatted;
};

const mapUserHistoryRow = (
  item: UserHistoryRow,
  departmentNames: Map<string, string>
): HistoryEvent => {
  const before = item.before_json ? parseJson<Record<string, unknown>>(item.before_json, {}) : null;
  const after = item.after_json ? parseJson<Record<string, unknown>>(item.after_json, {}) : null;
  const changedFields = parseJson<string[]>(item.changed_fields_json, []);

  return {
    id: item.id,
    type: item.type,
    changedFields: expandHistoryChangedFields(changedFields, before, after),
    before,
    after,
    beforeDisplay: formatHistoryDepartmentSnapshot(before, departmentNames),
    afterDisplay: formatHistoryDepartmentSnapshot(after, departmentNames),
    occurredAt: item.occurred_at
  };
};

const selectUserHistoryRows = (
  companyId: number,
  openId: string,
  pagination?: PaginationParams
) => {
  const limitClause = pagination ? " LIMIT ? OFFSET ?" : "";
  const params: Array<string | number> = [companyId, openId];
  if (pagination) {
    params.push(pagination.pageSize, getPaginationOffset(pagination));
  }

  return getDb()
    .prepare(
      `SELECT id, type, changed_fields_json, before_json, after_json, occurred_at
       FROM user_change_events
       WHERE company_id = ? AND user_open_id = ?
       ORDER BY occurred_at DESC, id DESC${limitClause}`
    )
    .all(...params) as UserHistoryRow[];
};

export const listUserHistory = (companyId: number, openId: string) => {
  const departmentNames = getDepartmentDisplayNames(companyId);
  return selectUserHistoryRows(companyId, openId).map((row) =>
    mapUserHistoryRow(row, departmentNames)
  );
};

export const listUserHistoryPage = (
  companyId: number,
  openId: string,
  pagination: PaginationParams
): PaginatedResult<HistoryEvent> => {
  const departmentNames = getDepartmentDisplayNames(companyId);
  const { total } = getDb()
    .prepare(
      `SELECT COUNT(*) AS total
       FROM user_change_events
       WHERE company_id = ? AND user_open_id = ?`
    )
    .get(companyId, openId) as { total: number };
  const items = selectUserHistoryRows(companyId, openId, pagination).map((row) =>
    mapUserHistoryRow(row, departmentNames)
  );

  return { items, total, ...pagination };
};
