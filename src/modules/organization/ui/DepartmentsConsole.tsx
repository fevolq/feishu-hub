"use client";

import { Avatar, Button, Select, Table, Tabs, Tree } from "@arco-design/web-react";
import identityStyles from "@/shared/ui/user/UserIdentity.module.css";
import type { CompanyOption, EmployeeTab, UserDetailItem } from "../contracts";
import { UserDetailModal } from "./UserDetailModal";
import { useDepartmentsController } from "./useDepartmentsController";
import styles from "./Organization.module.css";

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function DepartmentsConsole({ companies }: { companies: CompanyOption[] }) {
  const controller = useDepartmentsController(companies);
  const columns = [
    {
      title: "头像",
      dataIndex: "avatarUrl",
      width: 72,
      render: (_: string | null, record: UserDetailItem) => (
        <Avatar size={28} className={identityStyles.avatar}>
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
        <Button size="small" type="text" onClick={() => controller.setSelectedUser(record)}>
          详情
        </Button>
      )
    }
  ];

  const pagination = (scope: EmployeeTab) => ({
    current: controller.pagination.page,
    pageSize: controller.pagination.pageSize,
    total: controller.pagination.total,
    showTotal: true,
    sizeCanChange: false,
    onChange: (page: number) => {
      if (controller.selectedDepartmentId) {
        void controller.loadDepartmentUsers(controller.selectedDepartmentId, scope, page);
      }
    }
  });

  return (
    <>
      <div className="work-surface">
        <div className={`${styles.toolbar} ${styles.departmentsToolbar}`}>
          <Select
            className={styles.companySelect}
            placeholder="公司主体"
            value={controller.companyId}
            onChange={controller.setCompanyId}
            options={companies.map((company) => ({ label: company.name, value: company.id }))}
          />
        </div>
        <div className={styles.splitView}>
          <div>
            <Tree
              blockNode
              showLine
              treeData={controller.tree}
              selectedKeys={controller.selectedDepartmentId ? [controller.selectedDepartmentId] : []}
              onSelect={(keys) => controller.selectDepartment(keys[0] as string | undefined)}
            />
          </div>
          <div>
            <Tabs
              activeTab={controller.activeTab}
              onChange={(key) => controller.selectTab(key as EmployeeTab)}
              size="small"
            >
              <Tabs.TabPane
                key="direct"
                title={controller.selectedDepartmentId ? "直属员工" : "选择部门"}
              >
                <Table
                  rowKey="openId"
                  columns={columns}
                  data={controller.activeTab === "direct" ? controller.users : []}
                  loading={controller.loading}
                  scroll={{ x: 820 }}
                  pagination={pagination("direct")}
                />
              </Tabs.TabPane>
              <Tabs.TabPane
                key="descendant"
                title="下属员工"
                disabled={!controller.selectedDepartmentId}
              >
                <Table
                  rowKey="openId"
                  columns={columns}
                  data={controller.activeTab === "descendant" ? controller.users : []}
                  loading={controller.loading}
                  scroll={{ x: 820 }}
                  pagination={pagination("descendant")}
                />
              </Tabs.TabPane>
            </Tabs>
          </div>
        </div>
      </div>
      <UserDetailModal
        companyId={controller.companyId}
        user={controller.selectedUser}
        onClose={() => controller.setSelectedUser(null)}
      />
    </>
  );
}
