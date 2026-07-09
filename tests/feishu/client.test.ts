import { afterEach, describe, expect, it, vi } from "vitest";
import { FeishuClient } from "@/server/feishu/client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });

describe("FeishuClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Feishu's supported page size when listing departments", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes("/auth/v3/tenant_access_token/internal")) {
        return jsonResponse({ code: 0, tenant_access_token: "tenant-token" });
      }

      return jsonResponse({
        code: 0,
        data: {
          items: [],
          has_more: false
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await new FeishuClient({ appId: "cli_xxx", appSecret: "secret" }).fetchDepartments();

    const departmentUrl = new URL(requestedUrls.find((url) => url.includes("/contact/v3/departments"))!);
    expect(departmentUrl.searchParams.get("page_size")).toBe("50");
  });

  it("includes Feishu response message when an API request fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v3/tenant_access_token/internal")) {
        return jsonResponse({ code: 0, tenant_access_token: "tenant-token" });
      }

      return jsonResponse({ code: 40011, msg: "page size is more than 50 error" }, 400);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new FeishuClient({ appId: "cli_xxx", appSecret: "secret" }).fetchDepartments()).rejects.toThrow(
      "page size is more than 50 error"
    );
  });

  it("reports HTTP status when Feishu returns a non-JSON error body", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v3/tenant_access_token/internal")) {
        return jsonResponse({ code: 0, tenant_access_token: "tenant-token" });
      }

      return new Response("Bad Gateway", { status: 502 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new FeishuClient({ appId: "cli_xxx", appSecret: "secret" }).fetchDepartments()).rejects.toThrow(
      "HTTP 502"
    );
  });
});
