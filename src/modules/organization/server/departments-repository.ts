import { getDb } from "@/shared/server/db/connection";
import type { Department } from "../domain/types";
import type { DepartmentListFilters, DepartmentListItem } from "../contracts";
import { parseJson } from "./user-mappers";

export const listDepartments = (
  companyId: number,
  filters: DepartmentListFilters = {}
): DepartmentListItem[] => {
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

export const replaceDepartments = (
  companyId: number,
  departments: Department[],
  occurredAt: string
) => {
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
