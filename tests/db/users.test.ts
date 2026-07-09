import { describe, expect, it } from "vitest";
import { formatDepartmentDisplayName } from "@/server/db/repositories/org";

describe("department display name", () => {
  it("marks deleted departments in user-facing text", () => {
    expect(formatDepartmentDisplayName("美术组", "deleted")).toBe("美术组（已取消）");
  });

  it("keeps active department names unchanged", () => {
    expect(formatDepartmentDisplayName("美术组", "active")).toBe("美术组");
  });
});
