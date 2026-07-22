"use client";

import { Tag, Timeline } from "@arco-design/web-react";
import { formatDateTime } from "@/shared/lib/datetime";
import type { HistoryEvent } from "../contracts";
import styles from "./Organization.module.css";

type HistoryDayGroup = {
  date: string;
  events: HistoryEvent[];
};

const changeTypeMeta: Record<string, { label: string; color: string }> = {
  created: { label: "新增", color: "green" },
  updated: { label: "更新", color: "blue" },
  resigned: { label: "离职", color: "gray" },
  restored: { label: "重新在职", color: "lime" }
};

const fieldLabels: Record<string, string> = {
  openId: "员工 ID",
  unionId: "Union ID",
  name: "姓名",
  email: "邮箱",
  jobTitle: "岗位",
  leaderOpenId: "上级",
  primaryDepartmentId: "主部门",
  departmentIds: "所属部门",
  avatarUrl: "头像",
  mobile: "手机号",
  status: "状态"
};

const formatChangedField = (field: string) => {
  if (field === "extra") return "扩展字段";
  if (field.startsWith("extra.")) return `扩展字段：${field.slice("extra.".length)}`;
  return fieldLabels[field] || field;
};

const getChangeTypeMeta = (type: string) => changeTypeMeta[type] || { label: type, color: "blue" };
const getHistoryDate = (value: string) => formatDateTime(value).slice(0, 10);
const getHistoryTime = (value: string) => formatDateTime(value).slice(11);

const groupHistoryByDate = (events: HistoryEvent[]): HistoryDayGroup[] => {
  const sortedEvents = [...events].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );
  const groups = new Map<string, HistoryEvent[]>();

  for (const event of sortedEvents) {
    const date = getHistoryDate(event.occurredAt);
    groups.set(date, [...(groups.get(date) || []), event]);
  }

  return [...groups.entries()].map(([date, items]) => ({ date, events: items }));
};

const getSnapshotValue = (snapshot: Record<string, unknown> | null, field: string): unknown => {
  if (!snapshot) return undefined;

  return field.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, snapshot);
};

const formatChangeValue = (field: string, value: unknown): string => {
  if (value === undefined || value === null || value === "") return "空";

  if (field === "status") {
    if (value === "active") return "在职";
    if (value === "resigned") return "离职";
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatChangeValue(field, item)).join(", ") : "[]";
  }
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const renderChangeValueContent = (field: string, value: unknown) => {
  if (field === "avatarUrl" && typeof value === "string" && value) {
    return (
      <img
        className={styles.historyAvatarImage}
        src={value}
        alt="头像"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return formatChangeValue(field, value);
};

const renderChangedValue = (item: HistoryEvent, field: string) => {
  const before = item.beforeDisplay ?? item.before;
  const after = item.afterDisplay ?? item.after;

  return (
    <div key={field} className={styles.changeDetailRow}>
      <div className={styles.changeFieldName}>{formatChangedField(field)}</div>
      <div className={`${styles.changeValue} ${styles.changeValueBefore}`}>
        {renderChangeValueContent(field, getSnapshotValue(before, field))}
      </div>
      <div className={`${styles.changeValue} ${styles.changeValueAfter}`}>
        {renderChangeValueContent(field, getSnapshotValue(after, field))}
      </div>
    </div>
  );
};

export function UserHistoryTimeline({ events }: { events: HistoryEvent[] }) {
  const historyGroups = groupHistoryByDate(events);

  if (!historyGroups.length) {
    return <span className={styles.changeEmpty}>暂无变更历史</span>;
  }

  return (
    <div className={styles.historyDayList}>
      {historyGroups.map((group) => (
        <section key={group.date} className={styles.historyDaySection}>
          <div className={styles.historyDayTitle}>{group.date}</div>
          <Timeline>
            {group.events.map((item) => {
              const typeMeta = getChangeTypeMeta(item.type);

              return (
                <Timeline.Item key={item.id}>
                  <div className={styles.historyEventCard}>
                    <div className={styles.historyEventHeader}>
                      <Tag color={typeMeta.color}>{typeMeta.label}</Tag>
                      <span className={styles.historyEventTime}>{getHistoryTime(item.occurredAt)}</span>
                    </div>
                    {item.changedFields.length ? (
                      <div className={styles.changeDetailTable}>
                        <div className={styles.changeDetailHead}>
                          <span>字段</span>
                          <span>变更前</span>
                          <span>变更后</span>
                        </div>
                        <div className={styles.changeDetailList}>
                          {item.changedFields.map((field) => renderChangedValue(item, field))}
                        </div>
                      </div>
                    ) : (
                      <span className={styles.changeEmpty}>无字段变化</span>
                    )}
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </section>
      ))}
    </div>
  );
}
