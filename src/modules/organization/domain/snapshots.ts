import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { User } from "./types";

dayjs.extend(utc);
dayjs.extend(timezone);

export type DailySnapshotRecord = {
  companyId: number;
  userOpenId: string;
  snapshotDate: string;
  snapshotJson: string;
  status: User["status"];
  name: string;
  email: string | null;
  jobTitle: string | null;
  leaderOpenId: string | null;
  primaryDepartmentId: string | null;
  departmentIdsJson: string;
  capturedAt: string;
  syncRunId: number;
};

export const toSnapshotDate = (occurredAt: string, timeZone: string) => {
  return dayjs.utc(occurredAt).tz(timeZone).format("YYYY-MM-DD");
};

export const buildDailySnapshotRecord = ({
  companyId,
  user,
  snapshotDate,
  capturedAt,
  syncRunId
}: {
  companyId: number;
  user: User;
  snapshotDate: string;
  capturedAt: string;
  syncRunId: number;
}): DailySnapshotRecord => ({
  companyId,
  userOpenId: user.openId,
  snapshotDate,
  snapshotJson: JSON.stringify(user),
  status: user.status,
  name: user.name,
  email: user.email,
  jobTitle: user.jobTitle,
  leaderOpenId: user.leaderOpenId,
  primaryDepartmentId: user.primaryDepartmentId,
  departmentIdsJson: JSON.stringify(user.departmentIds),
  capturedAt,
  syncRunId
});
