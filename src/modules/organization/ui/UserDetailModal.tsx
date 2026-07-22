"use client";

import { Avatar, Descriptions, Modal, Tag } from "@arco-design/web-react";
import { formatDateTime } from "@/shared/lib/datetime";
import identityStyles from "@/shared/ui/user/UserIdentity.module.css";
import type { UserDetailItem } from "../contracts";
import { UserHistoryPanel } from "./UserHistoryPanel";
import styles from "./Organization.module.css";

type UserDetailModalProps = {
  companyId: number | undefined;
  user: UserDetailItem | null;
  onClose: () => void;
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function UserDetailModal({ companyId, user, onClose }: UserDetailModalProps) {
  const userDescriptions = user
    ? [
        {
          label: "用户",
          value: (
            <div className={identityStyles.nameCell}>
              <Avatar size={28} className={identityStyles.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  getAvatarText(user.name)
                )}
              </Avatar>
              <span className={identityStyles.nameText}>{user.name}</span>
            </div>
          )
        },
        {
          label: "状态",
          value: (
            <Tag color={user.status === "active" ? "green" : "gray"}>
              {user.status === "active" ? "在职" : "离职"}
            </Tag>
          )
        },
        { label: "岗位", value: user.jobTitle || "-" },
        { label: "部门", value: user.departmentName || "-" },
        { label: "上级", value: user.leaderName || "-" },
        { label: "邮箱", value: user.email || "-" },
        { label: "信息更新", value: user.updatedAt ? formatDateTime(user.updatedAt) : "-" },
        { label: "最近出现", value: user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "-" },
        { label: "员工 ID", value: user.openId, span: 2 }
      ]
    : [];

  return (
    <Modal
      title={user ? `${user.name} 的用户信息` : "用户信息"}
      visible={Boolean(user)}
      footer={null}
      unmountOnExit
      onCancel={onClose}
      style={{ width: "min(920px, calc(100vw - 24px))" }}
    >
      <div className={styles.userDetailModal}>
        <Descriptions title="当前信息" data={userDescriptions} column={2} border />
        <section className={styles.userHistorySection}>
          <div className={styles.detailSectionTitle}>变更历史</div>
          <UserHistoryPanel companyId={companyId} openId={user?.openId} />
        </section>
      </div>
    </Modal>
  );
}
