import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("companies routes", () => {
  it("keeps app secrets server-side when companies are created, read, and updated", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-company-routes-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
    vi.resetModules();
    vi.doMock("@/modules/auth/server/guards", () => ({
      requireApiAuth: async () => null
    }));

    const collectionRoute = await import("@/app/api/companies/route");
    const detailRoute = await import("@/app/api/companies/[id]/route");

    const createResponse = await collectionRoute.POST(
      new Request("http://example.com/api/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Alpha",
          appId: "cli_alpha",
          appSecret: "secret_alpha",
          enabled: true
        })
      }) as never
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.company).not.toHaveProperty("appSecret");

    const companyId = createBody.company.id as number;
    const listResponse = await collectionRoute.GET();
    const listBody = await listResponse.json();
    expect(listBody.companies[0]).not.toHaveProperty("appSecret");

    const detailResponse = await detailRoute.GET(
      new Request(`http://example.com/api/companies/${companyId}`) as never,
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    const detailBody = await detailResponse.json();
    expect(detailBody.company).not.toHaveProperty("appSecret");

    const updateResponse = await detailRoute.PATCH(
      new Request(`http://example.com/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Alpha Renamed" })
      }) as never,
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    const updateBody = await updateResponse.json();
    expect(updateBody.company).not.toHaveProperty("appSecret");

    const { getCompany } = await import("@/modules/companies/server/repository");
    expect(getCompany(companyId)).toMatchObject({
      name: "Alpha Renamed",
      appSecret: "secret_alpha"
    });
  });
});
