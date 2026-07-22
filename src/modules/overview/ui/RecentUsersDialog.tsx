"use client";

import {
  Avatar,
  Button,
  Modal,
  Table,
  Tag,
  type TableColumnProps
} from "@arco-design/web-react";
import type { PaginationMeta } from "@/shared/contracts/pagination";
import { formatDateTime } from "@/shared/lib/datetime";
import identityStyles from "@/shared/ui/user/UserIdentity.module.css";
import type {
  RecentActivityType,
  RecentCompanyUser,
  RecentUsersDialogState
} from "../contracts";
import styles from "./RecentUsersDialog.module.css";

export const activityMeta: Record<RecentActivityType, { title: string; timeLabel: string }> = {
  joined: { title: "近 7 天入职员工", timeLabel: "入职时间" },
  resigned: { title: "近 7 天离职员工", timeLabel: "离职时间" }
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function RecentUsersDialog({
  dialog,
  users,
  pagination,
  loading,
  onClose,
  onSelectUser,
  onPageChange
}: {
  dialog: RecentUsersDialogState | null;
  users: RecentCompanyUser[];
  pagination: PaginationMeta;
  loading: boolean;
  onClose: () => void;
  onSelectUser: (user: RecentCompanyUser) => void;
  onPageChange: (page: number) => void;
}) {
  const columns: TableColumnProps<RecentCompanyUser>[] = [
    {
      title: "员工",
      dataIndex: "name",
      width: 180,
      fixed: "left",
      render: (_: unknown, record) => (
        <div className={identityStyles.nameCell}>
          <Avatar size={28} className={identityStyles.avatar}>
            {record.avatarUrl ? (
              <img src={record.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              getAvatarText(record.name)
            )}
          </Avatar>
          <button
            className={styles.nameButton}
            type="button"
            onClick={() => onSelectUser(record)}
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
        <Button size="small" type="text" onClick={() => onSelectUser(record)}>
          详情
        </Button>
      )
    }
  ];

  return (
    <Modal
      title={dialog ? `${dialog.companyName} · ${activityMeta[dialog.type].title}` : "近 7 天员工"}
      visible={Boolean(dialog)}
      footer={null}
      unmountOnExit
      onCancel={onClose}
      style={{ width: "min(1040px, calc(100vw - 24px))" }}
    >
      <Table
        rowKey="openId"
        columns={columns}
        data={users}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: true,
          sizeCanChange: false,
          hideOnSinglePage: true,
          onChange: onPageChange
        }}
        noDataElement="暂无相关员工"
      />
    </Modal>
  );
}
