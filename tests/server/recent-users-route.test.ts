import { describe, expect, it } from "vitest";
import { normalizeDateTimeParam } from "@/server/http/date-params";

describe("recent users route parameters", () => {
  it("normalizes offset timestamps before SQLite comparison", () => {
    expect(normalizeDateTimeParam("2026-07-08T23:00:00+08:00")).toBe(
      "2026-07-08T15:00:00.000Z"
    );
  });

  it("rejects missing or invalid timestamps", () => {
    expect(normalizeDateTimeParam(null)).toBeNull();
    expect(normalizeDateTimeParam("not-a-date")).toBeNull();
  });
});
