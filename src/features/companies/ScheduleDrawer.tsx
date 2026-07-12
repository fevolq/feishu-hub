"use client";

import {
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  type FormInstance,
  type TableColumnProps
} from "@arco-design/web-react";
import { IconDelete, IconEdit, IconPlus, IconRefresh } from "@arco-design/web-react/icon";
import { formatTime } from "./company-format";
import type { Company, CompanySyncSchedule, ScheduleFormValues } from "./types";

type ScheduleDrawerProps = {
  company: Company | null;
  schedules: CompanySyncSchedule[];
  visible: boolean;
  editorVisible: boolean;
  editingSchedule: CompanySyncSchedule | null;
  loading: boolean;
  form: FormInstance<ScheduleFormValues>;
  onCreate: () => void;
  onEdit: (schedule: CompanySyncSchedule) => void;
  onDelete: (schedule: CompanySyncSchedule) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  onCloseEditor: () => void;
};

export function ScheduleDrawer({
  company,
  schedules,
  visible,
  editorVisible,
  editingSchedule,
  loading,
  form,
  onCreate,
  onEdit,
  onDelete,
  onRefresh,
  onSubmit,
  onClose,
  onCloseEditor
}: ScheduleDrawerProps) {
  const columns: TableColumnProps<CompanySyncSchedule>[] = [
    { title: "名称", render: (_: unknown, record) => record.name || "未命名" },
    {
      title: "crontab",
      render: (_: unknown, record) => <span className="cron-expression">{record.cronExpression}</span>
    },
    {
      title: "状态",
      render: (_: unknown, record) => (
        <Tag color={record.enabled ? "blue" : "gray"}>{record.enabled ? "启用" : "停用"}</Tag>
      )
    },
    { title: "上次触发", render: (_: unknown, record) => formatTime(record.lastTriggeredAt) },
    { title: "下次触发", render: (_: unknown, record) => formatTime(record.nextRunAt) },
    {
      title: "操作",
      width: 120,
      render: (_: unknown, record) => (
        <Space>
          <Tooltip content="编辑">
            <Button icon={<IconEdit />} size="small" onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm title="确认删除这条定时任务？" onOk={() => void onDelete(record)}>
            <Button icon={<IconDelete />} size="small" status="danger" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Drawer
        title={`${company?.name || ""} 定时任务`}
        visible={visible}
        width="min(860px, 100vw)"
        footer={null}
        onCancel={onClose}
      >
        <div className="toolbar">
          <Button type="primary" icon={<IconPlus />} onClick={onCreate}>
            新增 crontab
          </Button>
          <Button icon={<IconRefresh />} onClick={() => void onRefresh()}>
            刷新
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          data={schedules}
          loading={loading}
          pagination={false}
          scroll={{ x: 820 }}
        />
      </Drawer>

      <Drawer
        title={editingSchedule ? "编辑 crontab" : "新增 crontab"}
        visible={editorVisible}
        width="min(460px, 100vw)"
        confirmLoading={loading}
        onOk={onSubmit}
        onCancel={onCloseEditor}
      >
        <Form form={form} layout="vertical">
          <Form.Item field="name" label="名称">
            <Input placeholder="例如：工作日早上同步" />
          </Form.Item>
          <Form.Item
            field="cronExpression"
            label="crontab 表达式"
            rules={[{ required: true, message: "请输入 crontab 表达式" }]}
            extra="格式：分 时 日 月 周，例如 0 9 * * * 表示每天 09:00。"
          >
            <Input placeholder="0 9 * * *" />
          </Form.Item>
          <Form.Item field="enabled" label="启用定时任务" triggerPropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
