import { afterEach, describe, expect, it, vi } from "vitest";
import { FeishuClient } from "@/modules/sync/server/feishu/client";

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

  it("captures complete paged organization responses without the tenant token", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/auth/v3/tenant_access_token/internal")) {
        return jsonResponse({ code: 0, tenant_access_token: "tenant-token" });
      }

      if (url.pathname.includes("/contact/v3/departments")) {
        const parentId = url.searchParams.get("parent_department_id");
        return jsonResponse({
          code: 0,
          data: {
            items:
              parentId === "0"
                ? [{ open_department_id: "od_1", name: "研发部", custom_department_field: "kept" }]
                : [],
            has_more: false
          }
        });
      }

      return jsonResponse({
        code: 0,
        data: {
          items: [
            {
              open_id: "ou_1",
              name: "张三",
              department_ids: ["od_1"],
              custom_user_field: { nested: "kept" }
            }
          ],
          has_more: false
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new FeishuClient({ appId: "cli_xxx", appSecret: "secret" });
    const departments = await client.fetchDepartments();
    await client.fetchUsers(departments);
    const snapshot = client.getRawOrganizationSnapshot();

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.departmentRequests).toHaveLength(2);
    expect(snapshot.departmentRequests[0]).toMatchObject({
      parentOpenDepartmentId: null,
      pages: [
        {
          response: {
            data: {
              items: [{ custom_department_field: "kept" }]
            }
          }
        }
      ]
    });
    expect(snapshot.departmentRequests[1]).toMatchObject({
      parentOpenDepartmentId: "od_1",
      pages: [{ response: { data: { items: [] } } }]
    });
    expect(snapshot.userRequests).toHaveLength(1);
    expect(snapshot.userRequests[0]).toMatchObject({
      openDepartmentId: "od_1",
      pages: [
        {
          response: {
            data: {
              items: [{ custom_user_field: { nested: "kept" } }]
            }
          }
        }
      ]
    });
    expect(JSON.stringify(snapshot)).not.toContain("tenant-token");
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
