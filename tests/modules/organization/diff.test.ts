import { describe, expect, it } from "vitest";
import { diffUserSnapshots } from "@/modules/organization/domain/diff";
import type { NormalizedUser } from "@/modules/organization/domain/types";

const baseUser: NormalizedUser = {
  openId: "ou_1",
  unionId: "on_1",
  name: "张三",
  email: "zhangsan@example.com",
  jobTitle: "工程师",
  leaderOpenId: "ou_leader",
  primaryDepartmentId: "od_1",
  departmentIds: ["od_1"],
  avatarUrl: null,
  mobile: null,
  status: "active",
  extra: {}
};

describe("diffUserSnapshots", () => {
  it("marks a missing previous user as created", () => {
    const diff = diffUserSnapshots(null, baseUser);

    expect(diff?.type).toBe("created");
    expect(diff?.changedFields).toEqual(["openId"]);
  });

  it("tracks changed current fields", () => {
    const next = { ...baseUser, jobTitle: "高级工程师", email: "zs@example.com" };

    const diff = diffUserSnapshots(baseUser, next);

    expect(diff?.type).toBe("updated");
    expect(diff?.changedFields).toEqual(["email", "jobTitle"]);
  });

  it("tracks changed extra fields by nested path", () => {
    const previous = {
      ...baseUser,
      extra: {
        city: "shanghai",
        custom: { level: 1, tags: ["a", "b"] },
        unchanged: true
      }
    };
    const next = {
      ...baseUser,
      extra: {
        city: "beijing",
        custom: { level: 2, tags: ["b", "a"] },
        added: "yes",
        unchanged: true
      }
    };

    const diff = diffUserSnapshots(previous, next);

    expect(diff?.type).toBe("updated");
    expect(diff?.changedFields).toEqual(["extra.added", "extra.city", "extra.custom.level"]);
  });

  it("marks a missing next user as resigned", () => {
    const diff = diffUserSnapshots(baseUser, null);

    expect(diff?.type).toBe("resigned");
    expect(diff?.changedFields).toEqual(["status"]);
  });

  it("does not emit events when snapshots are equivalent", () => {
    const diff = diffUserSnapshots(baseUser, { ...baseUser, departmentIds: ["od_1"] });

    expect(diff).toBeNull();
  });
});
