export type Department = {
  openDepartmentId: string;
  parentOpenDepartmentId: string | null;
  name: string;
  extra: Record<string, unknown>;
};

export type UserStatus = "active" | "resigned";

export type User = {
  openId: string;
  unionId: string | null;
  name: string;
  email: string | null;
  jobTitle: string | null;
  leaderOpenId: string | null;
  primaryDepartmentId: string | null;
  departmentIds: string[];
  avatarUrl: string | null;
  mobile: string | null;
  status: UserStatus;
  extra: Record<string, unknown>;
};

export type NormalizedDepartment = Department;
export type NormalizedUser = User;

export type FeishuCredentials = {
  appId: string;
  appSecret: string;
};
