"use client";

import { Button, Space, Table, Tag, Tooltip, type TableColumnProps } from "@arco-design/web-react";
import {
  IconDragDotVertical,
  IconEdit,
  IconRefresh,
  IconSchedule
} from "@arco-design/web-react/icon";
import type { DragEvent } from "react";
import { formatTime, syncStatusColor, syncStatusText } from "./company-format";
import type { Company } from "./types";

type CompanyTableProps = {
  companies: Company[];
  loading: boolean;
  orderingSaving: boolean;
  draggingCompanyId: number | null;
  syncingCompanyId: number | null;
  onSync: (company: Company) => void;
  onEdit: (company: Company) => void;
  onSchedules: (company: Company) => void;
  onDragStart: (event: DragEvent<HTMLSpanElement>, company: Company) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLTableRowElement>, company: Company) => void;
};

export function CompanyTable({
  companies,
  loading,
  orderingSaving,
  draggingCompanyId,
  syncingCompanyId,
  onSync,
  onEdit,
  onSchedules,
  onDragStart,
  onDragEnd,
  onDrop
}: CompanyTableProps) {
  const columns: TableColumnProps<Company>[] = [
    {
      title: "",
      width: 44,
      render: (_: unknown, record) => (
        <Tooltip content="拖动排序">
          <span
            className="company-drag-handle"
            draggable
            aria-label="拖动排序"
            onDragStart={(event) => onDragStart(event, record)}
            onDragEnd={onDragEnd}
          >
            <IconDragDotVertical />
          </span>
        </Tooltip>
      )
    },
    { title: "公司", dataIndex: "name" },
    {
      title: "状态",
      render: (_: unknown, record) => (
        <Tag color={record.enabled ? "green" : "gray"}>{record.enabled ? "启用" : "停用"}</Tag>
      )
    },
    {
      title: "最近同步",
      width: 340,
      render: (_: unknown, record) => {
        const run = record.latestSyncRun;
        if (!run) {
          return "-";
        }

        return (
          <Space direction="vertical" size={4}>
            <Space>
              <Tag color={syncStatusColor(run.status)}>{syncStatusText(run.status)}</Tag>
              <span>{formatTime(run.finishedAt || run.startedAt)}</span>
            </Space>
            <span className="sync-summary">
              部门 {run.departmentsCount} / 用户 {run.usersCount} / 新增 {run.createdCount} / 更新 {run.updatedCount}
            </span>
            {run.error ? <span className="sync-error">{run.error}</span> : null}
          </Space>
        );
      }
    },
    {
      title: "操作",
      width: 240,
      render: (_: unknown, record) => (
        <Space>
          <Tooltip content="手动同步">
            <Button
              icon={<IconRefresh />}
              size="small"
              disabled={!record.enabled}
              loading={syncingCompanyId === record.id}
              onClick={() => onSync(record)}
            />
          </Tooltip>
          <Button icon={<IconSchedule />} size="small" onClick={() => onSchedules(record)}>
            定时
          </Button>
          <Tooltip content="编辑公司">
            <Button icon={<IconEdit />} size="small" onClick={() => onEdit(record)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      data={companies}
      loading={loading || orderingSaving}
      pagination={false}
      scroll={{ x: 820 }}
      onRow={(record) => ({
        className: draggingCompanyId === record.id ? "company-row-dragging" : "",
        onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
          if (draggingCompanyId && draggingCompanyId !== record.id && !orderingSaving) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }
        },
        onDrop: (event: DragEvent<HTMLTableRowElement>) => onDrop(event, record)
      })}
    />
  );
}
