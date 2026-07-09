"use client";

import {
  Avatar,
  Button,
  Descriptions,
  Message,
  Modal,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Tree
} from "@arco-design/web-react";
import { useCallback, useEffect, useState } from "react";
import { UserHistoryTimeline, type HistoryEvent } from "@/features/users/UserHistoryTimeline";
import { readApiJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/datetime";

type CompanyOption = { id: number; name: string };
type TreeNode = { key: string; title: string; children?: TreeNode[] };
type EmployeeTab = "direct" | "descendant";
type UserItem = {
  id: number;
  openId: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  jobTitle: string | null;
  departmentName: string | null;
  leaderName: string | null;
  status: "active" | "resigned";
  lastSeenAt: string;
  resignedAt: string | null;
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function DepartmentsConsole({ companies }: { companies: CompanyOption[] }) {
  const [companyId, setCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [directUsers, setDirectUsers] = useState<UserItem[]>([]);
  const [descendantUsers, setDescendantUsers] = useState<UserItem[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<EmployeeTab>("direct");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadTree = useCallback(async (departmentId?: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : "";
      const response = await fetch(`/api/companies/${companyId}/departments${params}`);
      const body = await readApiJson<{
        tree?: TreeNode[];
        users?: UserItem[];
        directUsers?: UserItem[];
        descendantUsers?: UserItem[];
      }>(response, "加载部门失败");
      setTree(body.tree || []);
      setDirectUsers(body.directUsers || body.users || []);
      setDescendantUsers(body.descendantUsers || []);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "加载部门失败");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const openUserDetail = async (user: UserItem) => {
    if (!companyId) return;
    setSelectedUser(user);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.openId)}/history?companyId=${companyId}`);
      const body = await readApiJson<{ events?: HistoryEvent[] }>(response, "加载历史失败");
      setHistory(body.events || []);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "加载历史失败");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setHistory([]);
    setHistoryLoading(false);
  };

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
      render: (_: string | null, record: UserItem) => (
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
      render: (_: unknown, record: UserItem) => (
        <Button size="small" type="text" onClick={() => openUserDetail(record)}>
          详情
        </Button>
      )
    }
  ];

  const userDescriptions = selectedUser
    ? [
        {
          label: "用户",
          value: (
            <div className="user-name-cell">
              <Avatar size={28} className="user-avatar">
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  getAvatarText(selectedUser.name)
                )}
              </Avatar>
              <span className="user-name-text">{selectedUser.name}</span>
            </div>
          )
        },
        {
          label: "状态",
          value: (
            <Tag color={selectedUser.status === "active" ? "green" : "gray"}>
              {selectedUser.status === "active" ? "在职" : "离职"}
            </Tag>
          )
        },
        { label: "岗位", value: selectedUser.jobTitle || "-" },
        { label: "部门", value: selectedUser.departmentName || "-" },
        { label: "上级", value: selectedUser.leaderName || "-" },
        { label: "邮箱", value: selectedUser.email || "-" },
        { label: "最近出现", value: selectedUser.lastSeenAt ? formatDateTime(selectedUser.lastSeenAt) : "-" },
        { label: "员工 ID", value: selectedUser.openId, span: 2 }
      ]
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">部门树</h1>
        </div>
      </div>
      <div className="work-surface">
        <div className="toolbar">
          <Select
            placeholder="公司主体"
            value={companyId}
            onChange={setCompanyId}
            style={{ width: 220 }}
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
      <Modal
        title={selectedUser ? `${selectedUser.name} 的用户信息` : "用户信息"}
        visible={Boolean(selectedUser)}
        footer={null}
        unmountOnExit
        onCancel={closeUserDetail}
        style={{ width: "min(920px, 92vw)" }}
      >
        <div className="user-detail-modal">
          <Descriptions title="当前信息" data={userDescriptions} column={2} border />
          <section className="user-history-section">
            <div className="detail-section-title">变更历史</div>
            {historyLoading ? (
              <div className="history-loading">
                <Spin />
              </div>
            ) : (
              <UserHistoryTimeline events={history} />
            )}
          </section>
        </div>
      </Modal>
    </>
  );
}
