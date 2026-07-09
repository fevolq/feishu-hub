import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const loadCompaniesRepository = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-companies-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.sqlite");
  vi.resetModules();
  return import("@/server/db/repositories/companies");
};

describe("company ordering", () => {
  it("lists companies by stored order and persists reorder updates", async () => {
    const repo = await loadCompaniesRepository();
    const first = repo.createCompany({ name: "Alpha", appId: "cli_a", appSecret: "secret_a" });
    const second = repo.createCompany({ name: "Beta", appId: "cli_b", appSecret: "secret_b" });
    const third = repo.createCompany({ name: "Gamma", appId: "cli_c", appSecret: "secret_c" });

    expect(repo.listCompanies().map((company) => company.name)).toEqual(["Alpha", "Beta", "Gamma"]);

    const updateCompanySortOrder = (
      repo as typeof repo & { updateCompanySortOrder?: (companyIds: number[]) => void }
    ).updateCompanySortOrder;
    expect(typeof updateCompanySortOrder).toBe("function");

    updateCompanySortOrder?.([third!.id, first!.id, second!.id]);

    expect(repo.listCompanies().map((company) => company.name)).toEqual(["Gamma", "Alpha", "Beta"]);
  });

  it("rejects invalid reorder payloads", async () => {
    const repo = await loadCompaniesRepository();
    const first = repo.createCompany({ name: "Alpha", appId: "cli_a", appSecret: "secret_a" });
    const second = repo.createCompany({ name: "Beta", appId: "cli_b", appSecret: "secret_b" });

    expect(() => repo.updateCompanySortOrder([first!.id, first!.id])).toThrow("重复公司");
    expect(() => repo.updateCompanySortOrder([first!.id])).toThrow("全部公司");
    expect(() => repo.updateCompanySortOrder([first!.id, second!.id, 999])).toThrow("不存在的公司");
  });
});
