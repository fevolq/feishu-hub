"use client";

import {
  Avatar,
  Descriptions,
  Message,
  Modal,
  Spin,
  Tag
} from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/datetime";
import { UserHistoryTimeline, type HistoryEvent } from "./UserHistoryTimeline";

export type UserDetailItem = {
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
  updatedAt: string;
  resignedAt: string | null;
};

type UserDetailModalProps = {
  companyId: number | undefined;
  user: UserDetailItem | null;
  onClose: () => void;
};

const getAvatarText = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

export function UserDetailModal({ companyId, user, onClose }: UserDetailModalProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !user) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const controller = new AbortController();
    setHistory([]);
    setHistoryLoading(true);

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(user.openId)}/history?companyId=${companyId}`,
          { signal: controller.signal }
        );
        const body = await readApiJson<{ events?: HistoryEvent[] }>(response, "加载历史失败");
        setHistory(body.events || []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        Message.error(error instanceof Error ? error.message : "加载历史失败");
      } finally {
        if (!controller.signal.aborted) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();
    return () => controller.abort();
  }, [companyId, user]);

  const userDescriptions = user
    ? [
        {
          label: "用户",
          value: (
            <div className="user-name-cell">
              <Avatar size={28} className="user-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  getAvatarText(user.name)
                )}
              </Avatar>
              <span className="user-name-text">{user.name}</span>
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
  );
}
