"use client";

import {
  Avatar,
  Button,
  Drawer,
  Input,
  Select,
  Table,
  Tag
} from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { formatDateTime } from "@/shared/lib/datetime";
import identityStyles from "@/shared/ui/user/UserIdentity.module.css";
import type { CompanyOption, UserListItem, UserStatusFilter } from "../contracts";
import { UserHistoryPanel } from "./UserHistoryPanel";
import { useUsersController } from "./useUsersController";
import styles from "./Organization.module.css";

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function UsersConsole({ companies }: { companies: CompanyOption[] }) {
  const controller = useUsersController(companies);
  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 140,
      fixed: "left" as const,
      render: (_: unknown, record: UserListItem) => (
        <div className={identityStyles.nameCell}>
          <Avatar size={28} className={identityStyles.avatar}>
            {record.avatarUrl ? (
              <img src={record.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              getAvatarText(record.name)
            )}
          </Avatar>
          <span className={identityStyles.nameText}>{record.name}</span>
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
      render: (_: unknown, record: UserListItem) => (
        <Tag color={record.status === "active" ? "green" : "gray"}>
          {record.status === "active" ? "在职" : "离职"}
        </Tag>
      )
    },
    {
      title: "信息更新",
      dataIndex: "updatedAt",
      width: 190,
      render: (_: unknown, record: UserListItem) => formatDateTime(record.updatedAt)
    },
    {
      title: "操作",
      width: 110,
      render: (_: unknown, record: UserListItem) => (
        <Button size="small" type="text" onClick={() => controller.setHistoryUser(record)}>
          历史
        </Button>
      )
    }
  ];

  return (
    <>
      <div className="work-surface">
        <div className={`${styles.toolbar} ${styles.usersToolbar}`}>
          <Select
            className={styles.companySelect}
            placeholder="公司主体"
            value={controller.companyId}
            onChange={controller.setCompanyId}
            options={companies.map((company) => ({ label: company.name, value: company.id }))}
          />
          <Select
            className={styles.statusSelect}
            value={controller.statusFilter}
            onChange={(value) => controller.setStatusFilter(value as UserStatusFilter)}
            options={[
              { label: "全部", value: "all" },
              { label: "在职", value: "active" },
              { label: "离职", value: "resigned" }
            ]}
          />
          <Input.Search
            className={styles.search}
            allowClear
            value={controller.query}
            onChange={controller.setQuery}
            onSearch={controller.submitSearch}
            placeholder="姓名、邮箱、岗位"
          />
          <Button
            className={styles.refresh}
            icon={<IconRefresh />}
            aria-label="刷新员工列表"
            title="刷新员工列表"
            onClick={() => controller.submitSearch()}
          />
        </div>
        <Table
          rowKey="openId"
          columns={columns}
          data={controller.users}
          loading={controller.loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: controller.pagination.page,
            pageSize: controller.pagination.pageSize,
            total: controller.pagination.total,
            showTotal: true,
            sizeCanChange: false,
            onChange: (page) => void controller.loadUsers(controller.submittedQuery, page)
          }}
        />
      </div>
      <Drawer
        title={controller.historyUser ? `${controller.historyUser.name} 的变更历史` : "变更历史"}
        visible={Boolean(controller.historyUser)}
        width="min(920px, 100vw)"
        footer={null}
        onCancel={() => controller.setHistoryUser(null)}
      >
        <UserHistoryPanel
          companyId={controller.companyId}
          openId={controller.historyUser?.openId}
        />
      </Drawer>
    </>
  );
}
