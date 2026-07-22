"use client";

import { Message } from "@arco-design/web-react";
import { useRef, useState } from "react";
import { COMPACT_PAGE_SIZE, type PaginationMeta } from "@/shared/contracts/pagination";
import { readApiJson } from "@/shared/ui/api-client";
import type { UserDetailItem } from "@/modules/organization/contracts";
import type {
  CompanyOverviewCard,
  RecentActivityType,
  RecentCompanyUser,
  RecentUsersDialogState
} from "../contracts";

export const useOverviewController = (since: string) => {
  const [dialog, setDialog] = useState<RecentUsersDialogState | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentCompanyUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: COMPACT_PAGE_SIZE,
    total: 0
  });
  const [selectedUser, setSelectedUser] = useState<UserDetailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const loadRecentUsers = async (target: RecentUsersDialogState, page = 1) => {
    const version = ++requestVersion.current;
    setPagination((current) => ({ ...current, page }));
    setLoading(true);

    try {
      const params = new URLSearchParams({
        type: target.type,
        since,
        page: String(page),
        pageSize: String(COMPACT_PAGE_SIZE)
      });
      const response = await fetch(`/api/companies/${target.companyId}/recent-users?${params}`);
      const body = await readApiJson<{
        users?: RecentCompanyUser[];
        pagination?: PaginationMeta;
      }>(response, "加载员工失败");
      if (requestVersion.current === version) {
        setRecentUsers(body.users || []);
        setPagination(body.pagination || {
          page,
          pageSize: COMPACT_PAGE_SIZE,
          total: 0
        });
      }
    } catch (error) {
      if (requestVersion.current === version) {
        Message.error(error instanceof Error ? error.message : "加载员工失败");
      }
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  };

  const openRecentUsers = (company: CompanyOverviewCard, type: RecentActivityType) => {
    const target = { companyId: company.id, companyName: company.name, type };
    setDialog(target);
    setRecentUsers([]);
    setSelectedUser(null);
    setPagination({ page: 1, pageSize: COMPACT_PAGE_SIZE, total: 0 });
    void loadRecentUsers(target, 1);
  };

  const closeRecentUsers = () => {
    requestVersion.current += 1;
    setDialog(null);
    setRecentUsers([]);
    setSelectedUser(null);
    setLoading(false);
  };

  return {
    dialog,
    recentUsers,
    pagination,
    selectedUser,
    setSelectedUser,
    loading,
    loadRecentUsers,
    openRecentUsers,
    closeRecentUsers
  };
};
