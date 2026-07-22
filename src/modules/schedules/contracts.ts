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

export type CompanySyncScheduleInput = {
  name?: string | null;
  cronExpression: string;
  enabled?: boolean;
  nextRunAt?: string | null;
};

export type CompanySyncScheduleUpdate = Partial<CompanySyncScheduleInput>;

export type ScheduleFormValues = {
  name?: string;
  cronExpression: string;
  enabled: boolean;
};
