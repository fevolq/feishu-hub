import type { Department, User } from "@/modules/organization/domain/types";

export type PersistSnapshotInput = {
  companyId: number;
  syncRunId: number;
  departments: Department[];
  users: User[];
  occurredAt: string;
};

export type PersistSnapshotStats = {
  departmentsCount: number;
  usersCount: number;
  createdCount: number;
  updatedCount: number;
  resignedCount: number;
  restoredCount: number;
};
