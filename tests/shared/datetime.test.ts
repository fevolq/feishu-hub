import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/shared/lib/datetime";

describe("formatDateTime", () => {
  it("formats UTC timestamps in Asia/Shanghai time", () => {
    expect(formatDateTime("2026-07-08T08:35:35.094Z")).toBe("2026-07-08 16:35:35");
  });

  it("returns a placeholder for missing or invalid values", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("not-a-date")).toBe("-");
  });
});
