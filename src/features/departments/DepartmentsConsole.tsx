"use client";

import {
  Avatar,
  Button,
  Message,
  Select,
  Table,
  Tabs,
  Tree
} from "@arco-design/web-react";
import { useCallback, useEffect, useState } from "react";
import {
  UserDetailModal,
  type UserDetailItem
} from "@/features/users/UserDetailModal";
import { readApiJson } from "@/lib/api-client";

type CompanyOption = { id: number; name: string };
type TreeNode = { key: string; title: string; children?: TreeNode[] };
type EmployeeTab = "direct" | "descendant";
const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function DepartmentsConsole({ companies }: { companies: CompanyOption[] }) {
  const [companyId, setCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [directUsers, setDirectUsers] = useState<UserDetailItem[]>([]);
  const [descendantUsers, setDescendantUsers] = useState<UserDetailItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetailItem | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<EmployeeTab>("direct");
  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async (departmentId?: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : "";
      const response = await fetch(`/api/companies/${companyId}/departments${params}`);
      const body = await readApiJson<{
        tree?: TreeNode[];
        directUsers?: UserDetailItem[];
        descendantUsers?: UserDetailItem[];
      }>(response, "加载部门失败");
      setTree(body.tree || []);
      setDirectUsers(body.directUsers || []);
      setDescendantUsers(body.descendantUsers || []);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "加载部门失败");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setSelectedDepartmentId(undefined);
    setActiveTab("direct");
    void loadTree();
  }, [companyId, loadTree]);

  const columns = [
    {
      title: "头像",
      dataIndex: "avatarUrl",
      width: 72,
      render: (_: string | null, record: UserDetailItem) => (
        <Avatar size={28} className="user-avatar">
          {record.avatarUrl ? (
            <img src={record.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            getAvatarText(record.name)
          )}
        </Avatar>
      )
    },
    { title: "用户名", dataIndex: "name", width: 140 },
    { title: "岗位", dataIndex: "jobTitle" },
    { title: "部门", dataIndex: "departmentName", width: 160 },
    { title: "上级", dataIndex: "leaderName", width: 140 },
    {
      title: "操作",
      width: 90,
      render: (_: unknown, record: UserDetailItem) => (
        <Button size="small" type="text" onClick={() => setSelectedUser(record)}>
          详情
        </Button>
      )
    }
  ];

  return (
    <>
      <div className="work-surface">
        <div className="toolbar departments-toolbar">
          <Select
            className="toolbar-company-select"
            placeholder="公司主体"
            value={companyId}
            onChange={setCompanyId}
            options={companies.map((company) => ({ label: company.name, value: company.id }))}
          />
        </div>
        <div className="split-view">
          <div>
            <Tree
              blockNode
              showLine
              treeData={tree}
              selectedKeys={selectedDepartmentId ? [selectedDepartmentId] : []}
              onSelect={(keys) => {
                const nextKey = keys[0] as string | undefined;
                setSelectedDepartmentId(nextKey);
                setActiveTab("direct");
                void loadTree(nextKey);
              }}
            />
          </div>
          <div>
            <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as EmployeeTab)} size="small">
              <Tabs.TabPane key="direct" title={selectedDepartmentId ? "直属员工" : "选择部门"}>
                <Table
                  rowKey="openId"
                  columns={columns}
                  data={directUsers}
                  loading={loading}
                  scroll={{ x: 820 }}
                  pagination={{ pageSize: 20 }}
                />
              </Tabs.TabPane>
              <Tabs.TabPane key="descendant" title="下属员工" disabled={!selectedDepartmentId}>
                <Table
                  rowKey="openId"
                  columns={columns}
                  data={descendantUsers}
                  loading={loading}
                  scroll={{ x: 820 }}
                  pagination={{ pageSize: 20 }}
                />
              </Tabs.TabPane>
            </Tabs>
          </div>
        </div>
      </div>
      <UserDetailModal
        companyId={companyId}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}
