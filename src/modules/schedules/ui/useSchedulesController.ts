"use client";

import { Form, Message } from "@arco-design/web-react";
import { useState } from "react";
import { readApiJson } from "@/shared/ui/api-client";
import type { Company } from "@/modules/companies/contracts";
import type { CompanySyncSchedule, ScheduleFormValues } from "../contracts";

export function useSchedulesController() {
  const [company, setCompany] = useState<Company | null>(null);
  const [schedules, setSchedules] = useState<CompanySyncSchedule[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CompanySyncSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ScheduleFormValues>();

  const load = async (companyId?: number) => {
    const targetCompanyId = companyId ?? company?.id;
    if (!targetCompanyId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${targetCompanyId}/schedules`);
      const body = await readApiJson<{ schedules: CompanySyncSchedule[] }>(response, "读取定时任务失败");
      setSchedules(body.schedules);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "读取定时任务失败");
    } finally {
      setLoading(false);
    }
  };

  const open = async (record: Company) => {
    setCompany(record);
    setSchedules([]);
    setDrawerVisible(true);
    await load(record.id);
  };

  const close = () => {
    setDrawerVisible(false);
    setCompany(null);
    setSchedules([]);
  };

  const openCreate = () => {
    setEditingSchedule(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      cronExpression: "0 9 * * *",
      enabled: true
    });
    setEditorVisible(true);
  };

  const openEdit = (record: CompanySyncSchedule) => {
    setEditingSchedule(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name || "",
      cronExpression: record.cronExpression,
      enabled: record.enabled
    });
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    form.resetFields();
  };

  const submit = async () => {
    if (!company) return;

    const values = await form.validate();
    setLoading(true);
    try {
      const response = await fetch(
        editingSchedule
          ? `/api/companies/${company.id}/schedules/${editingSchedule.id}`
          : `/api/companies/${company.id}/schedules`,
        {
          method: editingSchedule ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        }
      );
      await readApiJson(response, "保存定时任务失败");
      Message.success("定时任务已保存");
      closeEditor();
      await load(company.id);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "保存定时任务失败");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (record: CompanySyncSchedule) => {
    if (!company) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${company.id}/schedules/${record.id}`, {
        method: "DELETE"
      });
      await readApiJson(response, "删除定时任务失败");
      Message.success("定时任务已删除");
      await load(company.id);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "删除定时任务失败");
    } finally {
      setLoading(false);
    }
  };

  return {
    company,
    schedules,
    drawerVisible,
    editorVisible,
    editingSchedule,
    loading,
    form,
    open,
    close,
    openCreate,
    openEdit,
    closeEditor,
    load,
    submit,
    remove
  };
}
