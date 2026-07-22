import type { Department, User } from "@/modules/organization/domain/types";
import { FeishuRawSnapshotCollector } from "./raw-snapshot";
import { FeishuTransport } from "./transport";

type RawDepartment = {
  open_department_id: string;
  name: string;
  [key: string]: unknown;
};

type RawUser = {
  open_id?: string;
  union_id?: string;
  name?: string;
  enterprise_email?: string;
  email?: string;
  job_title?: string;
  leader_user_id?: string;
  department_ids?: string[];
  avatar?: { avatar_72?: string; avatar_origin?: string };
  mobile?: string;
  [key: string]: unknown;
};

export class FeishuOrganizationReader {
  constructor(
    private readonly transport: FeishuTransport,
    private readonly rawSnapshotCollector: FeishuRawSnapshotCollector
  ) {}

  async fetchDepartments(): Promise<Department[]> {
    const departments: Department[] = [];
    const seen = new Set<string>();
    this.rawSnapshotCollector.resetDepartmentRequests();

    const visit = async (parentOpenDepartmentId: string | null) => {
      const parentParam = parentOpenDepartmentId || "0";
      const requestSnapshot = this.rawSnapshotCollector.startDepartmentRequest(parentOpenDepartmentId);
      const items = await this.transport.getAllPages<RawDepartment>(
        "/contact/v3/departments",
        {
          parent_department_id: parentParam,
          department_id_type: "open_department_id"
        },
        (page) => requestSnapshot.pages.push(page)
      );

      for (const item of items) {
        if (!item.open_department_id || seen.has(item.open_department_id)) {
          continue;
        }
        seen.add(item.open_department_id);
        const { open_department_id: openDepartmentId, name, ...extra } = item;
        departments.push({
          openDepartmentId,
          parentOpenDepartmentId,
          name,
          extra
        });
        await visit(openDepartmentId);
      }
    };

    await visit(null);
    return departments;
  }

  async fetchUsers(departments: Department[]): Promise<User[]> {
    const users = new Map<string, User>();
    this.rawSnapshotCollector.resetUserRequests();

    for (const department of departments) {
      const requestSnapshot = this.rawSnapshotCollector.startUserRequest(department.openDepartmentId);
      const items = await this.transport.getAllPages<RawUser>(
        "/contact/v3/users",
        {
          department_id: department.openDepartmentId,
          department_id_type: "open_department_id",
          user_id_type: "open_id"
        },
        (page) => requestSnapshot.pages.push(page)
      );

      for (const item of items) {
        if (!item.open_id) {
          continue;
        }
        const previous = users.get(item.open_id);
        const departmentIds = new Set(previous?.departmentIds || []);
        departmentIds.add(department.openDepartmentId);
        const {
          open_id: openId,
          union_id: unionId,
          name,
          enterprise_email: enterpriseEmail,
          email,
          job_title: jobTitle,
          leader_user_id: leaderOpenId,
          department_ids: rawDepartmentIds,
          avatar,
          mobile,
          ...extra
        } = item;

        for (const id of rawDepartmentIds || []) {
          departmentIds.add(id);
        }

        users.set(openId, {
          openId,
          unionId: unionId || null,
          name: name || "",
          email: enterpriseEmail || email || null,
          jobTitle: jobTitle || null,
          leaderOpenId: leaderOpenId || null,
          primaryDepartmentId: previous?.primaryDepartmentId || department.openDepartmentId,
          departmentIds: [...departmentIds],
          avatarUrl: avatar?.avatar_72 || avatar?.avatar_origin || previous?.avatarUrl || null,
          mobile: mobile || null,
          status: "active",
          extra
        });
      }
    }

    return [...users.values()];
  }
}
