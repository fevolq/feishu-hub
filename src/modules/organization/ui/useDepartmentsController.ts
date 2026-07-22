"use client";

import { Message } from "@arco-design/web-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "@/shared/contracts/pagination";
import { readApiJson } from "@/shared/ui/api-client";
import type {
  CompanyOption,
  DepartmentTreeNode,
  EmployeeTab,
  UserDetailItem
} from "../contracts";

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0
};

export const useDepartmentsController = (companies: CompanyOption[]) => {
  const [companyId, setCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [tree, setTree] = useState<DepartmentTreeNode[]>([]);
  const [users, setUsers] = useState<UserDetailItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [selectedUser, setSelectedUser] = useState<UserDetailItem | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<EmployeeTab>("direct");
  const [treeLoading, setTreeLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const treeRequestVersion = useRef(0);
  const usersRequestVersion = useRef(0);

  const loadDepartmentTree = useCallback(async () => {
    const version = ++treeRequestVersion.current;
    if (!companyId) {
      setTree([]);
      setTreeLoading(false);
      return;
    }

    setTreeLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/departments`);
      const body = await readApiJson<{ tree?: DepartmentTreeNode[] }>(
        response,
        "加载部门失败"
      );
      if (treeRequestVersion.current === version) {
        setTree(body.tree || []);
      }
    } catch (error) {
      if (treeRequestVersion.current === version) {
        Message.error(error instanceof Error ? error.message : "加载部门失败");
      }
    } finally {
      if (treeRequestVersion.current === version) setTreeLoading(false);
    }
  }, [companyId]);

  const loadDepartmentUsers = useCallback(async (
    departmentId: string,
    scope: EmployeeTab = "direct",
    page = 1
  ) => {
    if (!companyId) return;
    const version = ++usersRequestVersion.current;
    setUsers([]);
    setPagination((current) => ({ ...current, page }));
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        departmentId,
        scope,
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE)
      });
      const response = await fetch(`/api/companies/${companyId}/departments?${params}`);
      const body = await readApiJson<{
        users?: UserDetailItem[];
        pagination?: PaginationMeta;
      }>(response, "加载部门失败");
      if (usersRequestVersion.current === version) {
        setUsers(body.users || []);
        setPagination(body.pagination || {
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          total: 0
        });
      }
    } catch (error) {
      if (usersRequestVersion.current === version) {
        Message.error(error instanceof Error ? error.message : "加载部门失败");
      }
    } finally {
      if (usersRequestVersion.current === version) setUsersLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    usersRequestVersion.current += 1;
    setTree([]);
    setSelectedDepartmentId(undefined);
    setSelectedUser(null);
    setActiveTab("direct");
    setUsers([]);
    setPagination(emptyPagination);
    void loadDepartmentTree();
  }, [companyId, loadDepartmentTree]);

  const selectDepartment = (departmentId: string | undefined) => {
    setSelectedDepartmentId(departmentId);
    setActiveTab("direct");
    setUsers([]);
    setPagination(emptyPagination);
    if (departmentId) {
      void loadDepartmentUsers(departmentId, "direct", 1);
    } else {
      usersRequestVersion.current += 1;
      setUsersLoading(false);
    }
  };

  const selectTab = (tab: EmployeeTab) => {
    setActiveTab(tab);
    setUsers([]);
    setPagination(emptyPagination);
    if (selectedDepartmentId) void loadDepartmentUsers(selectedDepartmentId, tab, 1);
  };

  return {
    companyId,
    setCompanyId,
    tree,
    users,
    pagination,
    selectedUser,
    setSelectedUser,
    selectedDepartmentId,
    activeTab,
    loading: treeLoading || usersLoading,
    loadDepartmentUsers,
    selectDepartment,
    selectTab
  };
};
