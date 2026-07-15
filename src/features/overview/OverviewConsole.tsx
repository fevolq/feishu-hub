"use client";

import {
  Avatar,
  Button,
  Message,
  Modal,
  Table,
  Tag,
  type TableColumnProps
} from "@arco-design/web-react";
import { useRef, useState } from "react";
import {
  UserDetailModal,
  type UserDetailItem
} from "@/features/users/UserDetailModal";
import { readApiJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/datetime";

type OverviewCompany = {
  id: number;
  name: string;
  employeeCount: number;
  historyCount: number;
  recentJoinedCount: number;
  recentResignedCount: number;
};

type RecentActivityType = "joined" | "resigned";
type RecentUserItem = UserDetailItem & { activityAt: string };
type RecentUsersDialog = {
  companyId: number;
  companyName: string;
  type: RecentActivityType;
};

const activityMeta: Record<RecentActivityType, { title: string; timeLabel: string }> = {
  joined: { title: "近 7 天入职员工", timeLabel: "入职时间" },
  resigned: { title: "近 7 天离职员工", timeLabel: "离职时间" }
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function OverviewConsole({
  companies,
  since
}: {
  companies: OverviewCompany[];
  since: string;
}) {
  const [dialog, setDialog] = useState<RecentUsersDialog | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<RecentUserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const openRecentUsers = async (company: OverviewCompany, type: RecentActivityType) => {
    const version = ++requestVersion.current;
    setDialog({ companyId: company.id, companyName: company.name, type });
    setRecentUsers([]);
    setSelectedUser(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({ type, since });
      const response = await fetch(`/api/companies/${company.id}/recent-users?${params}`);
      const body = await readApiJson<{ users?: RecentUserItem[] }>(response, "加载员工失败");
      if (requestVersion.current === version) {
        setRecentUsers(body.users || []);
      }
    } catch (error) {
      if (requestVersion.current === version) {
        Message.error(error instanceof Error ? error.message : "加载员工失败");
      }
    } finally {
      if (requestVersion.current === version) {
        setLoading(false);
      }
    }
  };

  const closeRecentUsers = () => {
    requestVersion.current += 1;
    setDialog(null);
    setRecentUsers([]);
    setSelectedUser(null);
    setLoading(false);
  };

  const columns: TableColumnProps<RecentUserItem>[] = [
    {
      title: "员工",
      dataIndex: "name",
      width: 180,
      fixed: "left",
      render: (_: unknown, record) => (
        <div className="user-name-cell">
          <Avatar size={28} className="user-avatar">
            {record.avatarUrl ? (
              <img src={record.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              getAvatarText(record.name)
            )}
          </Avatar>
          <button
            className="recent-user-name-button"
            type="button"
            onClick={() => setSelectedUser(record)}
          >
            {record.name}
          </button>
        </div>
      )
    },
    { title: "岗位", dataIndex: "jobTitle", width: 150 },
    { title: "部门", dataIndex: "departmentName", width: 180 },
    { title: "上级", dataIndex: "leaderName", width: 140 },
    {
      title: "状态",
      width: 90,
      render: (_: unknown, record) => (
        <Tag color={record.status === "active" ? "green" : "gray"}>
          {record.status === "active" ? "在职" : "离职"}
        </Tag>
      )
    },
    {
      title: dialog ? activityMeta[dialog.type].timeLabel : "时间",
      dataIndex: "activityAt",
      width: 180,
      render: (_: unknown, record) => formatDateTime(record.activityAt)
    },
    {
      title: "操作",
      width: 80,
      render: (_: unknown, record) => (
        <Button size="small" type="text" onClick={() => setSelectedUser(record)}>
          详情
        </Button>
      )
    }
  ];

  return (
    <>
      <div className="company-overview-grid">
        {companies.map((company) => (
          <section className="company-overview-card" key={company.id}>
            <h2 className="company-overview-name">{company.name}</h2>
            <div className="company-overview-metrics">
              <div className="company-overview-metric">
                <span className="company-overview-metric-label">人员数量</span>
                <strong className="company-overview-metric-value">{company.employeeCount}</strong>
              </div>
              <div className="company-overview-metric">
                <span className="company-overview-metric-label">历史总数量</span>
                <strong className="company-overview-metric-value">{company.historyCount}</strong>
              </div>
              <button
                className="company-overview-metric company-overview-metric-action"
                type="button"
                onClick={() => void openRecentUsers(company, "joined")}
              >
                <span className="company-overview-metric-label">近 7 天入职人数</span>
                <strong className="company-overview-metric-value">{company.recentJoinedCount}</strong>
              </button>
              <button
                className="company-overview-metric company-overview-metric-action"
                type="button"
                onClick={() => void openRecentUsers(company, "resigned")}
              >
                <span className="company-overview-metric-label">近 7 天离职人数</span>
                <strong className="company-overview-metric-value">{company.recentResignedCount}</strong>
              </button>
            </div>
          </section>
        ))}
      </div>

      <Modal
        title={dialog ? `${dialog.companyName} · ${activityMeta[dialog.type].title}` : "近 7 天员工"}
        visible={Boolean(dialog)}
        footer={null}
        unmountOnExit
        onCancel={closeRecentUsers}
        style={{ width: "min(1040px, calc(100vw - 24px))" }}
      >
        <Table
          rowKey="openId"
          columns={columns}
          data={recentUsers}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={recentUsers.length > 10 ? { pageSize: 10 } : false}
          noDataElement="暂无相关员工"
        />
      </Modal>

      <UserDetailModal
        companyId={dialog?.companyId}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}
