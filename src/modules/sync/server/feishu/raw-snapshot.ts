export type FeishuResponse<T> = {
  code: number;
  msg?: string;
  data?: T;
  tenant_access_token?: string;
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

export class FeishuRawSnapshotCollector {
  private departmentRequests: FeishuRawOrganizationSnapshot["departmentRequests"] = [];
  private userRequests: FeishuRawOrganizationSnapshot["userRequests"] = [];

  resetDepartmentRequests() {
    this.departmentRequests = [];
  }

  startDepartmentRequest(parentOpenDepartmentId: string | null) {
    const request = {
      parentOpenDepartmentId,
      pages: [] as FeishuRawApiPage[]
    };
    this.departmentRequests.push(request);
    return request;
  }

  resetUserRequests() {
    this.userRequests = [];
  }

  startUserRequest(openDepartmentId: string) {
    const request = {
      openDepartmentId,
      pages: [] as FeishuRawApiPage[]
    };
    this.userRequests.push(request);
    return request;
  }

  getSnapshot(): FeishuRawOrganizationSnapshot {
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
