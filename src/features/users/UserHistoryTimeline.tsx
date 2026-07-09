"use client";

import { Tag, Timeline } from "@arco-design/web-react";
import { formatDateTime } from "@/lib/datetime";

export type HistoryEvent = {
  id: number;
  type: string;
  changedFields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: string;
};

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
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

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

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const renderChangedValue = (item: HistoryEvent, field: string) => {
  return (
    <div key={field} className="change-detail-row">
      <div className="change-field-name">{formatChangedField(field)}</div>
      <div className="change-value change-value-before">{formatChangeValue(field, getSnapshotValue(item.before, field))}</div>
      <div className="change-value change-value-after">{formatChangeValue(field, getSnapshotValue(item.after, field))}</div>
    </div>
  );
};

export function UserHistoryTimeline({ events }: { events: HistoryEvent[] }) {
  const historyGroups = groupHistoryByDate(events);

  if (!historyGroups.length) {
    return <span className="change-empty">暂无变更历史</span>;
  }

  return (
    <div className="history-day-list">
      {historyGroups.map((group) => (
        <section key={group.date} className="history-day-section">
          <div className="history-day-title">{group.date}</div>
          <Timeline>
            {group.events.map((item) => {
              const typeMeta = getChangeTypeMeta(item.type);

              return (
                <Timeline.Item key={item.id}>
                  <div className="history-event-card">
                    <div className="history-event-header">
                      <Tag color={typeMeta.color}>{typeMeta.label}</Tag>
                      <span className="history-event-time">{getHistoryTime(item.occurredAt)}</span>
                    </div>
                    {item.changedFields.length ? (
                      <div className="change-detail-table">
                        <div className="change-detail-head">
                          <span>字段</span>
                          <span>变更前</span>
                          <span>变更后</span>
                        </div>
                        <div className="change-detail-list">
                          {item.changedFields.map((field) => renderChangedValue(item, field))}
                        </div>
                      </div>
                    ) : (
                      <span className="change-empty">无字段变化</span>
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
