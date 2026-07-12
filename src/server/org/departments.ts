import type { DepartmentListItem } from "../db/repositories/org";

export type DepartmentTreeNode = {
  key: string;
  title: string;
  children: DepartmentTreeNode[];
};

export const buildDepartmentTree = (departments: DepartmentListItem[]) => {
  const nodes = new Map<string, DepartmentTreeNode>();
  const roots: DepartmentTreeNode[] = [];

  for (const department of departments) {
    nodes.set(department.openDepartmentId, {
      key: department.openDepartmentId,
      title: department.name,
      children: []
    });
  }

  for (const department of departments) {
    const node = nodes.get(department.openDepartmentId);
    if (!node) continue;

    if (department.parentOpenDepartmentId && nodes.has(department.parentOpenDepartmentId)) {
      nodes.get(department.parentOpenDepartmentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

export const getDescendantDepartmentIds = (
  departments: DepartmentListItem[],
  departmentId: string
) => {
  const childrenByParent = new Map<string, string[]>();

  for (const department of departments) {
    if (!department.parentOpenDepartmentId) continue;
    childrenByParent.set(department.parentOpenDepartmentId, [
      ...(childrenByParent.get(department.parentOpenDepartmentId) || []),
      department.openDepartmentId
    ]);
  }

  const ids: string[] = [];
  const queue = [...(childrenByParent.get(departmentId) || [])];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    ids.push(current);
    queue.push(...(childrenByParent.get(current) || []));
  }

  return ids;
};
