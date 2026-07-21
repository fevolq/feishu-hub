import { appConfig } from "../config";
import type { FeishuCredentials, Department, User } from "../org/types";

export type FeishuResponse<T> = {
  code: number;
  msg?: string;
  data?: T;
  tenant_access_token?: string;
};

type PagedData<T> = {
  items?: T[];
  page_token?: string;
  has_more?: boolean;
};

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

export type FeishuRawApiPage = {
  requestUrl: string;
  response: FeishuResponse<unknown>;
};

export type FeishuRawOrganizationSnapshot = {
  schemaVersion: 1;
  departmentRequests: Array<{
    parentOpenDepartmentId: string | null;
    pages: FeishuRawApiPage[];
  }>;
  userRequests: Array<{
    openDepartmentId: string;
    pages: FeishuRawApiPage[];
  }>;
};

const FEISHU_PAGE_SIZE = 50;

const readFeishuResponse = async <T>(response: Response): Promise<FeishuResponse<T>> => {
  return (await response.json().catch(() => ({}))) as FeishuResponse<T>;
};

export class FeishuClient {
  private token: string | null = null;
  private departmentRequests: FeishuRawOrganizationSnapshot["departmentRequests"] = [];
  private userRequests: FeishuRawOrganizationSnapshot["userRequests"] = [];

  constructor(private readonly credentials: FeishuCredentials) {}

  private async auth() {
    if (this.token) {
      return this.token;
    }

    const response = await fetch(`${appConfig.feishuApiBaseUrl}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.credentials.appId,
        app_secret: this.credentials.appSecret
      })
    });

    const body = await readFeishuResponse<unknown>(response);
    if (!response.ok) {
      throw new Error(`飞书认证请求失败: HTTP ${response.status} ${body.msg || body.code || ""}`.trim());
    }
    if (body.code !== 0 || !body.tenant_access_token) {
      throw new Error(`飞书认证失败: ${body.msg || body.code}`);
    }

    this.token = body.tenant_access_token;
    return this.token;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | undefined>,
    onResponse?: (page: FeishuRawApiPage) => void
  ) {
    const token = await this.auth();
    const url = new URL(`${appConfig.feishuApiBaseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const body = await readFeishuResponse<T>(response);
    if (!response.ok) {
      throw new Error(`飞书接口请求失败: HTTP ${response.status} ${body.msg || body.code || ""}`.trim());
    }
    if (body.code !== 0) {
      throw new Error(`飞书接口返回错误: ${body.msg || body.code}`);
    }
    onResponse?.({
      requestUrl: url.toString(),
      response: body as FeishuResponse<unknown>
    });
    return body.data as T;
  }

  private async getAllPages<T>(
    path: string,
    params: Record<string, string | number | undefined>,
    onPage?: (page: FeishuRawApiPage) => void
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;

    do {
      const data = await this.get<PagedData<T>>(
        path,
        {
          ...params,
          page_size: FEISHU_PAGE_SIZE,
          page_token: pageToken
        },
        onPage
      );
      items.push(...(data.items || []));
      pageToken = data.has_more ? data.page_token : undefined;
    } while (pageToken);

    return items;
  }

  async fetchDepartments(): Promise<Department[]> {
    const departments: Department[] = [];
    const seen = new Set<string>();
    this.departmentRequests = [];

    const visit = async (parentOpenDepartmentId: string | null) => {
      const parentParam = parentOpenDepartmentId || "0";
      const requestSnapshot = {
        parentOpenDepartmentId,
        pages: [] as FeishuRawApiPage[]
      };
      this.departmentRequests.push(requestSnapshot);
      const items = await this.getAllPages<RawDepartment>(
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
    this.userRequests = [];

    for (const department of departments) {
      const requestSnapshot = {
        openDepartmentId: department.openDepartmentId,
        pages: [] as FeishuRawApiPage[]
      };
      this.userRequests.push(requestSnapshot);
      const items = await this.getAllPages<RawUser>(
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

  getRawOrganizationSnapshot(): FeishuRawOrganizationSnapshot {
    return {
      schemaVersion: 1,
      departmentRequests: this.departmentRequests.map((request) => ({
        ...request,
        pages: [...request.pages]
      })),
      userRequests: this.userRequests.map((request) => ({
        ...request,
        pages: [...request.pages]
      }))
    };
  }
}
