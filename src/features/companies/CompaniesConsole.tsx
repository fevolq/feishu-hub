"use client";

import { Button, Form, Message } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useState, type DragEvent } from "react";
import { readApiJson } from "@/lib/api-client";
import { CompanyEditorDrawer } from "./CompanyEditorDrawer";
import { CompanyTable } from "./CompanyTable";
import { ScheduleDrawer } from "./ScheduleDrawer";
import type { Company, CompanyFormValues, CompanySyncSchedule, ScheduleFormValues } from "./types";

export function CompaniesConsole({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderingSaving, setOrderingSaving] = useState(false);
  const [draggingCompanyId, setDraggingCompanyId] = useState<number | null>(null);
  const [syncingCompanyId, setSyncingCompanyId] = useState<number | null>(null);
  const [form] = Form.useForm<CompanyFormValues>();

  const [scheduleCompany, setScheduleCompany] = useState<Company | null>(null);
  const [schedules, setSchedules] = useState<CompanySyncSchedule[]>([]);
  const [scheduleDrawerVisible, setScheduleDrawerVisible] = useState(false);
  const [scheduleEditorVisible, setScheduleEditorVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CompanySyncSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm] = Form.useForm<ScheduleFormValues>();

  const reload = async () => {
    const response = await fetch("/api/companies");
    const body = await readApiJson<{ companies: Company[] }>(response, "加载公司失败");
    setCompanies(body.companies);
  };

  const loadSchedules = async (companyId?: number) => {
    const targetCompanyId = companyId ?? scheduleCompany?.id;
    if (!targetCompanyId) return;

    setScheduleLoading(true);
    try {
      const response = await fetch(`/api/companies/${targetCompanyId}/schedules`);
      const body = await readApiJson<{ schedules: CompanySyncSchedule[] }>(response, "读取定时任务失败");
      setSchedules(body.schedules);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "读取定时任务失败");
    } finally {
      setScheduleLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true });
    setDrawerVisible(true);
  };

  const openEdit = (record: Company) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue(record);
    setDrawerVisible(true);
  };

  const closeEditor = () => {
    setDrawerVisible(false);
    form.resetFields();
  };

  const openSchedules = async (record: Company) => {
    setScheduleCompany(record);
    setSchedules([]);
    setScheduleDrawerVisible(true);
    await loadSchedules(record.id);
  };

  const closeSchedules = () => {
    setScheduleDrawerVisible(false);
    setScheduleCompany(null);
    setSchedules([]);
  };

  const openCreateSchedule = () => {
    setEditingSchedule(null);
    scheduleForm.resetFields();
    scheduleForm.setFieldsValue({
      name: "",
      cronExpression: "0 9 * * *",
      enabled: true
    });
    setScheduleEditorVisible(true);
  };

  const openEditSchedule = (record: CompanySyncSchedule) => {
    setEditingSchedule(record);
    scheduleForm.resetFields();
    scheduleForm.setFieldsValue({
      name: record.name || "",
      cronExpression: record.cronExpression,
      enabled: record.enabled
    });
    setScheduleEditorVisible(true);
  };

  const closeScheduleEditor = () => {
    setScheduleEditorVisible(false);
    scheduleForm.resetFields();
  };

  const submit = async () => {
    const values = await form.validate();
    setLoading(true);
    try {
      const response = await fetch(editing ? `/api/companies/${editing.id}` : "/api/companies", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      await readApiJson(response, "保存失败");
      Message.success("已保存");
      closeEditor();
      await reload();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const submitSchedule = async () => {
    if (!scheduleCompany) return;

    const values = await scheduleForm.validate();
    setScheduleLoading(true);
    try {
      const response = await fetch(
        editingSchedule
          ? `/api/companies/${scheduleCompany.id}/schedules/${editingSchedule.id}`
          : `/api/companies/${scheduleCompany.id}/schedules`,
        {
          method: editingSchedule ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        }
      );
      await readApiJson(response, "保存定时任务失败");
      Message.success("定时任务已保存");
      closeScheduleEditor();
      await loadSchedules(scheduleCompany.id);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "保存定时任务失败");
    } finally {
      setScheduleLoading(false);
    }
  };

  const deleteSchedule = async (record: CompanySyncSchedule) => {
    if (!scheduleCompany) return;

    setScheduleLoading(true);
    try {
      const response = await fetch(`/api/companies/${scheduleCompany.id}/schedules/${record.id}`, {
        method: "DELETE"
      });
      await readApiJson(response, "删除定时任务失败");
      Message.success("定时任务已删除");
      await loadSchedules(scheduleCompany.id);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "删除定时任务失败");
    } finally {
      setScheduleLoading(false);
    }
  };

  const triggerSync = async (company: Company) => {
    setSyncingCompanyId(company.id);
    try {
      const response = await fetch(`/api/companies/${company.id}/sync`, { method: "POST" });
      await readApiJson(response, "同步失败");
      Message.success("同步完成");
      await reload();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setSyncingCompanyId(null);
    }
  };

  const moveCompany = (sourceId: number, targetId: number) => {
    const fromIndex = companies.findIndex((company) => company.id === sourceId);
    const toIndex = companies.findIndex((company) => company.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return companies;
    }

    const nextCompanies = [...companies];
    const [movedCompany] = nextCompanies.splice(fromIndex, 1);
    nextCompanies.splice(toIndex, 0, movedCompany);
    return nextCompanies;
  };

  const saveCompanyOrder = async (nextCompanies: Company[], previousCompanies: Company[]) => {
    setOrderingSaving(true);
    try {
      const response = await fetch("/api/companies/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: nextCompanies.map((company) => company.id) })
      });
      const body = await readApiJson<{ companies: Company[] }>(response, "保存公司排序失败");
      setCompanies(body.companies);
      Message.success("公司排序已保存");
    } catch (error) {
      setCompanies(previousCompanies);
      Message.error(error instanceof Error ? error.message : "保存公司排序失败");
    } finally {
      setOrderingSaving(false);
    }
  };

  const handleCompanyDragStart = (event: DragEvent<HTMLSpanElement>, company: Company) => {
    setDraggingCompanyId(company.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(company.id));
  };

  const handleCompanyDrop = (event: DragEvent<HTMLTableRowElement>, targetCompany: Company) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    const sourceId = draggedId ? Number(draggedId) : draggingCompanyId;
    setDraggingCompanyId(null);
    if (!sourceId || sourceId === targetCompany.id || orderingSaving) {
      return;
    }

    const previousCompanies = companies;
    const nextCompanies = moveCompany(sourceId, targetCompany.id);
    if (nextCompanies === companies) {
      return;
    }

    setCompanies(nextCompanies);
    void saveCompanyOrder(nextCompanies, previousCompanies);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">公司主体</h1>
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={openCreate}>
          新增
        </Button>
      </div>

      <div className="work-surface">
        <CompanyTable
          companies={companies}
          loading={loading}
          orderingSaving={orderingSaving}
          draggingCompanyId={draggingCompanyId}
          syncingCompanyId={syncingCompanyId}
          onSync={(company) => void triggerSync(company)}
          onEdit={openEdit}
          onSchedules={(company) => void openSchedules(company)}
          onDragStart={handleCompanyDragStart}
          onDragEnd={() => setDraggingCompanyId(null)}
          onDrop={handleCompanyDrop}
        />
      </div>

      <CompanyEditorDrawer
        visible={drawerVisible}
        editing={editing}
        loading={loading}
        form={form}
        onSubmit={submit}
        onCancel={closeEditor}
      />

      <ScheduleDrawer
        company={scheduleCompany}
        schedules={schedules}
        visible={scheduleDrawerVisible}
        editorVisible={scheduleEditorVisible}
        editingSchedule={editingSchedule}
        loading={scheduleLoading}
        form={scheduleForm}
        onCreate={openCreateSchedule}
        onEdit={openEditSchedule}
        onDelete={deleteSchedule}
        onRefresh={() => loadSchedules()}
        onSubmit={submitSchedule}
        onClose={closeSchedules}
        onCloseEditor={closeScheduleEditor}
      />
    </>
  );
}
