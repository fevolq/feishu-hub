export type Company = {
  id: number;
  name: string;
  appId: string;
  appSecret: string;
  enabled: boolean;
  sortOrder: number;
  latestSyncRun: CompanyLatestSyncRun | null;
};

export type CompanyLatestSyncRun = {
  id: number;
  triggerType: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  departmentsCount: number;
  usersCount: number;
  createdCount: number;
  updatedCount: number;
  resignedCount: number;
  restoredCount: number;
  error: string | null;
};

export type CompanySyncSchedule = {
  id: number;
  companyId: number;
  name: string | null;
  cronExpression: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyFormValues = {
  name: string;
  appId: string;
  appSecret: string;
  enabled: boolean;
};

export type ScheduleFormValues = {
  name?: string;
  cronExpression: string;
  enabled: boolean;
};
