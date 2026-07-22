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

export type Company = {
  id: number;
  name: string;
  appId: string;
  enabled: boolean;
  sortOrder: number;
  latestSyncRun: CompanyLatestSyncRun | null;
};

export type PublicCompany = Company;

export type CompanyInput = {
  name: string;
  appId: string;
  appSecret: string;
  enabled?: boolean;
};

export type CompanyFormValues = {
  name: string;
  appId: string;
  appSecret?: string;
  enabled: boolean;
};
