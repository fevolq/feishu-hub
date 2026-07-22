import { describe, expect, it } from "vitest";
import { buildDueScheduleBatches } from "@/modules/sync/server/scheduler";

describe("scheduler due schedule batching", () => {
  it("groups multiple due crontabs for the same company into one sync run", () => {
    const batches = buildDueScheduleBatches([
      { id: 1, companyId: 7, cronExpression: "0 9 * * *" },
      { id: 2, companyId: 7, cronExpression: "30 18 * * 1-5" },
      { id: 3, companyId: 9, cronExpression: "0 2 * * *" }
    ]);

    expect(batches).toEqual([
      { companyId: 7, scheduleIds: [1, 2] },
      { companyId: 9, scheduleIds: [3] }
    ]);
  });
});
