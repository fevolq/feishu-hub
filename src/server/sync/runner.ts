import { getCompany } from "../db/repositories/companies";
import {
  finishSyncRun,
  startSyncRun,
  type SyncTriggerType
} from "../db/repositories/sync-runs";
import { createSyncRawSnapshot } from "../db/repositories/sync-raw-snapshots";
import { FeishuClient } from "../feishu/client";
import { persistOrgSnapshot } from "./persist";

export const syncCompany = async (companyId: number, triggerType: SyncTriggerType = "manual") => {
  const company = getCompany(companyId);
  if (!company) {
    throw new Error("公司不存在");
  }
  if (!company.enabled) {
    throw new Error("公司已停用");
  }

  const syncRunId = startSyncRun(companyId, triggerType);
  const occurredAt = new Date().toISOString();

  try {
    const client = new FeishuClient({
      appId: company.appId,
      appSecret: company.appSecret
    });
    const departments = await client.fetchDepartments();
    const users = await client.fetchUsers(departments);
    createSyncRawSnapshot({
      companyId,
      syncRunId,
      payload: client.getRawOrganizationSnapshot(),
      capturedAt: new Date().toISOString()
    });
    const stats = persistOrgSnapshot({
      companyId,
      syncRunId,
      departments,
      users,
      occurredAt
    });

    finishSyncRun(syncRunId, "success", stats);

    return {
      syncRunId,
      ...stats
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    finishSyncRun(syncRunId, "failed", {}, message);
    throw error;
  }
};
