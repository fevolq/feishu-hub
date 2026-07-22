import { describe, expect, it, vi } from "vitest";

describe("login route", () => {
  it("returns 401 for non-string passwords", async () => {
    process.env.APP_PASSWORD = "pw";
    vi.resetModules();

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://example.com/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: {} })
      }) as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "密码不正确" });
  });
});
