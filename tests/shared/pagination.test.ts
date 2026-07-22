import { describe, expect, it } from "vitest";
import { parsePaginationParams } from "@/shared/http/pagination";

describe("pagination parameters", () => {
  it("uses defaults and parses positive page values", () => {
    expect(parsePaginationParams(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 20
    });
    expect(parsePaginationParams(new URLSearchParams("page=3&pageSize=50"))).toEqual({
      page: 3,
      pageSize: 50
    });
  });

  it("rejects invalid pages and oversized page sizes", () => {
    expect(parsePaginationParams(new URLSearchParams("page=0"))).toBeNull();
    expect(parsePaginationParams(new URLSearchParams("page=1.5"))).toBeNull();
    expect(parsePaginationParams(new URLSearchParams("pageSize=101"))).toBeNull();
  });
});
