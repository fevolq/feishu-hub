import { describe, expect, it } from "vitest";
import {
  buildDepartmentTree,
  getDepartmentAndDescendantIds
} from "@/server/org/departments";
import type { DepartmentListItem } from "@/server/db/repositories/org";

const departments: DepartmentListItem[] = [
  {
    openDepartmentId: "root",
    parentOpenDepartmentId: null,
    name: "总部",
    status: "active",
    deletedAt: null,
    extra: {}
  },
  {
    openDepartmentId: "eng",
    parentOpenDepartmentId: "root",
    name: "研发部",
    status: "active",
    deletedAt: null,
    extra: {}
  },
  {
    openDepartmentId: "frontend",
    parentOpenDepartmentId: "eng",
    name: "前端组",
    status: "active",
    deletedAt: null,
    extra: {}
  }
];

describe("department hierarchy helpers", () => {
  it("builds tree nodes from a flat department list", () => {
    expect(buildDepartmentTree(departments)).toEqual([
      {
        key: "root",
        title: "总部",
        children: [
          {
            key: "eng",
            title: "研发部",
            children: [{ key: "frontend", title: "前端组", children: [] }]
          }
        ]
      }
    ]);
  });

  it("returns the selected department and all descendants for descendant employee queries", () => {
    expect(getDepartmentAndDescendantIds(departments, "eng")).toEqual(["eng", "frontend"]);
  });
});
