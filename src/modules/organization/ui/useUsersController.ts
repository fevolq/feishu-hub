"use client";

import { Message } from "@arco-design/web-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "@/shared/contracts/pagination";
import { readApiJson } from "@/shared/ui/api-client";
import type {
  CompanyOption,
  UserListItem,
  UserStatusFilter
} from "../contracts";

export const useUsersController = (companies: CompanyOption[]) => {
  const [companyId, setCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("active");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [historyUser, setHistoryUser] = useState<UserListItem | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const loadUsers = useCallback(async (keyword: string, page = 1) => {
    if (!companyId) return;
    const version = ++requestVersion.current;
    setPagination((current) => ({ ...current, page }));
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        q: keyword,
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE)
      });
      const response = await fetch(`/api/companies/${companyId}/users?${params}`);
      const body = await readApiJson<{
        users?: UserListItem[];
        pagination?: PaginationMeta;
      }>(response, "加载用户失败");
      if (requestVersion.current === version) {
        setUsers(body.users || []);
        setPagination(body.pagination || { page, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
      }
    } catch (error) {
      if (requestVersion.current === version) {
        Message.error(error instanceof Error ? error.message : "加载用户失败");
      }
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [companyId, statusFilter]);

  const submitSearch = (keyword = query) => {
    setSubmittedQuery(keyword);
    if (keyword === submittedQuery) void loadUsers(keyword, 1);
  };

  useEffect(() => {
    void loadUsers(submittedQuery, 1);
  }, [loadUsers, submittedQuery]);

  return {
    companyId,
    setCompanyId,
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    submittedQuery,
    users,
    historyUser,
    setHistoryUser,
    pagination,
    loading,
    loadUsers,
    submitSearch
  };
};
