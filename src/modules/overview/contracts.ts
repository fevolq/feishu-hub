import type { UserListItem } from "@/modules/organization/contracts";

export type RecentActivityType = "joined" | "resigned";

export type RecentCompanyUser = UserListItem & {
  activityAt: string;
};

export type CompanyOverviewCard = {
  id: number;
  name: string;
  employeeCount: number;
  historyCount: number;
  recentJoinedCount: number;
  recentResignedCount: number;
};

export type RecentUsersDialogState = {
  companyId: number;
  companyName: string;
  type: RecentActivityType;
};
