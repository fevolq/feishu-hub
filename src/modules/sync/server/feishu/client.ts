import type {
  Department,
  FeishuCredentials,
  User
} from "@/modules/organization/domain/types";
import { FeishuOrganizationReader } from "./organization-reader";
import {
  FeishuRawSnapshotCollector,
  type FeishuRawOrganizationSnapshot
} from "./raw-snapshot";
import { FeishuTransport } from "./transport";

export type {
  FeishuRawApiPage,
  FeishuRawOrganizationSnapshot,
  FeishuResponse
} from "./raw-snapshot";

export class FeishuClient {
  private readonly rawSnapshotCollector = new FeishuRawSnapshotCollector();
  private readonly organizationReader: FeishuOrganizationReader;

  constructor(credentials: FeishuCredentials) {
    this.organizationReader = new FeishuOrganizationReader(
      new FeishuTransport(credentials),
      this.rawSnapshotCollector
    );
  }

  fetchDepartments(): Promise<Department[]> {
    return this.organizationReader.fetchDepartments();
  }

  fetchUsers(departments: Department[]): Promise<User[]> {
    return this.organizationReader.fetchUsers(departments);
  }

  getRawOrganizationSnapshot(): FeishuRawOrganizationSnapshot {
    return this.rawSnapshotCollector.getSnapshot();
  }
}
