import { describe, expect, it } from "vitest";
import { parsePositiveIntegerParam } from "@/shared/http/route-params";

describe("route params", () => {
  it("accepts positive integer route params", () => {
    expect(parsePositiveIntegerParam("42")).toBe(42);
  });

  it("rejects invalid route params", () => {
    expect(parsePositiveIntegerParam("0")).toBeNull();
    expect(parsePositiveIntegerParam("-1")).toBeNull();
    expect(parsePositiveIntegerParam("abc")).toBeNull();
    expect(parsePositiveIntegerParam("1.5")).toBeNull();
  });
});
