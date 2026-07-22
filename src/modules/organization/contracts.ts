import type { Department, User } from "./domain/types";

export type CompanyOption = { id: number; name: string };

export type UserListFilters = {
  status?: "all" | "active" | "resigned";
  departmentId?: string;
  departmentIds?: string[];
  query?: string;
};

export type UserListItem = {
  id: number;
  openId: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  jobTitle: string | null;
  leaderOpenId: string | null;
  leaderName: string | null;
  primaryDepartmentId: string | null;
  departmentName: string | null;
  departmentStatus: "active" | "deleted" | null;
  status: "active" | "resigned";
  lastSeenAt: string;
  updatedAt: string;
  resignedAt: string | null;
};

export type UserDetailItem = UserListItem;
export type UserStatusFilter = "all" | "active" | "resigned";

export type DepartmentListFilters = {
  includeDeleted?: boolean;
};

export type DepartmentListItem = Department & {
  status: "active" | "deleted";
  deletedAt: string | null;
};

export type DepartmentTreeNode = {
  key: string;
  title: string;
  children: DepartmentTreeNode[];
};

export type EmployeeTab = "direct" | "descendant";

export type StoredUser = {
  user: User;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
  resignedAt: string | null;
};

export type HistoryEvent = {
  id: number;
  type: string;
  changedFields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  beforeDisplay?: Record<string, unknown> | null;
  afterDisplay?: Record<string, unknown> | null;
  occurredAt: string;
};
