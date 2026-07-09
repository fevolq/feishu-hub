import { describe, expect, it } from "vitest";
import {
  buildDailySnapshotRecord,
  toSnapshotDate
} from "@/server/org/snapshots";
import type { NormalizedUser } from "@/server/org/types";

const user: NormalizedUser = {
  openId: "ou_1",
  unionId: "on_1",
  name: "张三",
  email: "zhangsan@example.com",
  jobTitle: "工程师",
  leaderOpenId: "ou_leader",
  primaryDepartmentId: "od_1",
  departmentIds: ["od_1", "od_2"],
  avatarUrl: null,
  mobile: null,
  status: "active",
  extra: { city: "上海" }
};

describe("daily user snapshots", () => {
  it("uses the configured local date for snapshot_date", () => {
    expect(toSnapshotDate("2026-07-07T16:30:00.000Z", "Asia/Shanghai")).toBe("2026-07-08");
  });

  it("builds a denormalized daily snapshot record", () => {
    const record = buildDailySnapshotRecord({
      companyId: 3,
      user,
      snapshotDate: "2026-07-08",
      capturedAt: "2026-07-08T10:00:00.000Z",
      syncRunId: 9
    });

    expect(record).toMatchObject({
      companyId: 3,
      userOpenId: "ou_1",
      snapshotDate: "2026-07-08",
      status: "active",
      name: "张三",
      syncRunId: 9
    });
    expect(JSON.parse(record.snapshotJson)).toMatchObject({
      openId: "ou_1",
      extra: { city: "上海" }
    });
  });
});
