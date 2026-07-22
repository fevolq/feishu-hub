import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadRoutes = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-schedules-api-contract-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();
  vi.doMock("@/modules/auth/server/guards", () => ({
    requireApiAuth: async () => null
  }));

  const [{ getDb }, collectionRoute, detailRoute, { NextRequest }] = await Promise.all([
    import("@/shared/server/db/connection"),
    import("@/app/api/companies/[id]/schedules/route"),
    import("@/app/api/companies/[id]/schedules/[scheduleId]/route"),
    import("next/server")
  ]);
  const db = getDb();
  const companyId = Number(
    db
      .prepare("INSERT INTO companies (name, app_id, app_secret) VALUES (?, ?, ?)")
      .run("Schedule Contract Co", "cli_schedule", "secret").lastInsertRowid
  );

  return { companyId, collectionRoute, detailRoute, NextRequest };
};

describe("sync schedules API contract", () => {
  it("preserves the GET, POST, PATCH, and DELETE response contract", async () => {
    const { companyId, collectionRoute, detailRoute, NextRequest } = await loadRoutes();
    const collectionContext = { params: Promise.resolve({ id: String(companyId) }) };

    const emptyResponse = await collectionRoute.GET(
      new NextRequest(`http://example.com/api/companies/${companyId}/schedules`),
      collectionContext
    );
    expect(emptyResponse.status).toBe(200);
    await expect(emptyResponse.json()).resolves.toEqual({ schedules: [] });

    const createResponse = await collectionRoute.POST(
      new NextRequest(`http://example.com/api/companies/${companyId}/schedules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Morning sync",
          cronExpression: "0 9 * * *",
          enabled: false
        })
      }),
      collectionContext
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody).toEqual({
      schedule: expect.objectContaining({
        id: expect.any(Number),
        companyId,
        name: "Morning sync",
        cronExpression: "0 9 * * *",
        enabled: false,
        lastTriggeredAt: null,
        nextRunAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    });

    const scheduleId = createBody.schedule.id as number;
    const detailContext = {
      params: Promise.resolve({ id: String(companyId), scheduleId: String(scheduleId) })
    };
    const updateResponse = await detailRoute.PATCH(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/schedules/${scheduleId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Enabled morning sync", enabled: true })
        }
      ),
      detailContext
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.schedule).toEqual(
      expect.objectContaining({
        id: scheduleId,
        companyId,
        name: "Enabled morning sync",
        cronExpression: "0 9 * * *",
        enabled: true,
        nextRunAt: expect.any(String)
      })
    );

    const listResponse = await collectionRoute.GET(
      new NextRequest(`http://example.com/api/companies/${companyId}/schedules`),
      collectionContext
    );
    const listBody = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listBody.schedules).toHaveLength(1);
    expect(listBody.schedules[0].id).toBe(scheduleId);

    const deleteResponse = await detailRoute.DELETE(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/schedules/${scheduleId}`,
        { method: "DELETE" }
      ),
      detailContext
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true });

    const missingDeleteResponse = await detailRoute.DELETE(
      new NextRequest(
        `http://example.com/api/companies/${companyId}/schedules/${scheduleId}`,
        { method: "DELETE" }
      ),
      detailContext
    );
    expect(missingDeleteResponse.status).toBe(404);
    expect(await missingDeleteResponse.json()).toEqual({ error: expect.any(String) });
  });

  it("preserves validation and not-found status codes as JSON errors", async () => {
    const { companyId, collectionRoute, detailRoute, NextRequest } = await loadRoutes();

    const invalidIdResponse = await collectionRoute.GET(
      new NextRequest("http://example.com/api/companies/invalid/schedules"),
      { params: Promise.resolve({ id: "invalid" }) }
    );
    expect(invalidIdResponse.status).toBe(400);
    expect(await invalidIdResponse.json()).toEqual({ error: expect.any(String) });

    const missingCompanyResponse = await collectionRoute.GET(
      new NextRequest("http://example.com/api/companies/999999/schedules"),
      { params: Promise.resolve({ id: "999999" }) }
    );
    expect(missingCompanyResponse.status).toBe(404);
    expect(await missingCompanyResponse.json()).toEqual({ error: expect.any(String) });

    const invalidCronResponse = await collectionRoute.POST(
      new NextRequest(`http://example.com/api/companies/${companyId}/schedules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cronExpression: "not a cron" })
      }),
      { params: Promise.resolve({ id: String(companyId) }) }
    );
    expect(invalidCronResponse.status).toBe(400);
    expect(await invalidCronResponse.json()).toEqual({ error: expect.any(String) });

    const invalidRouteResponse = await detailRoute.PATCH(
      new NextRequest(`http://example.com/api/companies/${companyId}/schedules/nope`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: false })
      }),
      { params: Promise.resolve({ id: String(companyId), scheduleId: "nope" }) }
    );
    expect(invalidRouteResponse.status).toBe(400);
    expect(await invalidRouteResponse.json()).toEqual({ error: expect.any(String) });
  });
});
