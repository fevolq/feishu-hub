"use client";

import {
  Avatar,
  Button,
  Drawer,
  Input,
  Message,
  Select,
  Table,
  Tag
} from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useCallback, useEffect, useState } from "react";
import { UserHistoryTimeline, type HistoryEvent } from "@/features/users/UserHistoryTimeline";
import { readApiJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/datetime";

type CompanyOption = { id: number; name: string };
type UserStatusFilter = "all" | "active" | "resigned";

type UserItem = {
  id: number;
  openId: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  jobTitle: string | null;
  leaderName: string | null;
  departmentName: string | null;
  status: "active" | "resigned";
  lastSeenAt: string;
  resignedAt: string | null;
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function UsersConsole({ companies }: { companies: CompanyOption[] }) {
  const [companyId, setCompanyId] = useState<number | undefined>(companies[0]?.id);
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyUser, setHistoryUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async (keyword: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, q: keyword });
      const response = await fetch(`/api/companies/${companyId}/users?${params}`);
      const body = await readApiJson<{ users?: UserItem[] }>(response, "加载用户失败");
      setUsers(body.users || []);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "加载用户失败");
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter]);

  const submitSearch = (keyword = query) => {
    setSubmittedQuery(keyword);
    if (keyword === submittedQuery) {
      void loadUsers(keyword);
    }
  };

  const openHistory = async (user: UserItem) => {
    if (!companyId) return;
    setHistoryUser(user);
    setHistory([]);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.openId)}/history?companyId=${companyId}`);
      const body = await readApiJson<{ events?: HistoryEvent[] }>(response, "加载历史失败");
      setHistory(body.events || []);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "加载历史失败");
    }
  };

  useEffect(() => {
    void loadUsers(submittedQuery);
  }, [loadUsers, submittedQuery]);

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 190,
      render: (_: unknown, record: UserItem) => (
        <div className="user-name-cell">
          <Avatar size={28} className="user-avatar">
            {record.avatarUrl ? (
              <img src={record.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              getAvatarText(record.name)
            )}
          </Avatar>
          <span className="user-name-text">{record.name}</span>
        </div>
      )
    },
    { title: "邮箱", dataIndex: "email", width: 220 },
    { title: "岗位", dataIndex: "jobTitle", width: 160 },
    { title: "部门", dataIndex: "departmentName", width: 180 },
    { title: "上级", dataIndex: "leaderName", width: 140 },
    {
      title: "状态",
      width: 100,
      render: (_: unknown, record: UserItem) => (
        <Tag color={record.status === "active" ? "green" : "gray"}>
          {record.status === "active" ? "在职" : "离职"}
        </Tag>
      )
    },
    {
      title: "最近出现",
      dataIndex: "lastSeenAt",
      width: 190,
      render: (_: unknown, record: UserItem) => formatDateTime(record.lastSeenAt)
    },
    {
      title: "操作",
      width: 110,
      render: (_: unknown, record: UserItem) => (
        <Button size="small" type="text" onClick={() => openHistory(record)}>
          历史
        </Button>
      )
    }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">员工列表</h1>
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
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as UserStatusFilter)}
            style={{ width: 120 }}
            options={[
              { label: "全部", value: "all" },
              { label: "在职", value: "active" },
              { label: "离职", value: "resigned" }
            ]}
          />
          <Input.Search
            allowClear
            value={query}
            onChange={setQuery}
            onSearch={submitSearch}
            placeholder="姓名、邮箱、岗位"
            style={{ width: 260 }}
          />
          <Button icon={<IconRefresh />} onClick={() => submitSearch()} />
        </div>
        <Table
          rowKey="openId"
          columns={columns}
          data={users}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 20 }}
        />
      </div>
      <Drawer
        title={historyUser ? `${historyUser.name} 的变更历史` : "变更历史"}
        visible={Boolean(historyUser)}
        width="min(920px, 92vw)"
        footer={null}
        onCancel={() => setHistoryUser(null)}
      >
        <UserHistoryTimeline events={history} />
      </Drawer>
    </>
  );
}
