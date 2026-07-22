"use client";

import { Form, Message } from "@arco-design/web-react";
import { useState, type DragEvent } from "react";
import { readApiJson } from "@/shared/ui/api-client";
import type { Company, CompanyFormValues } from "../contracts";

export function useCompaniesController(initialCompanies: Company[]) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderingSaving, setOrderingSaving] = useState(false);
  const [draggingCompanyId, setDraggingCompanyId] = useState<number | null>(null);
  const [syncingCompanyId, setSyncingCompanyId] = useState<number | null>(null);
  const [form] = Form.useForm<CompanyFormValues>();

  const reload = async () => {
    const response = await fetch("/api/companies");
    const body = await readApiJson<{ companies: Company[] }>(response, "加载公司失败");
    setCompanies(body.companies);
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
    form.setFieldsValue({
      name: record.name,
      appId: record.appId,
      appSecret: "",
      enabled: record.enabled
    });
    setDrawerVisible(true);
  };

  const closeEditor = () => {
    setDrawerVisible(false);
    form.resetFields();
  };

  const submit = async () => {
    const values = await form.validate();
    const { appSecret, ...companyFields } = values;
    const payload = editing && !appSecret?.trim()
      ? companyFields
      : { ...companyFields, appSecret };
    setLoading(true);
    try {
      const response = await fetch(editing ? `/api/companies/${editing.id}` : "/api/companies", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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

  const handleDragStart = (event: DragEvent<HTMLSpanElement>, company: Company) => {
    setDraggingCompanyId(company.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(company.id));
  };

  const handleDrop = (event: DragEvent<HTMLTableRowElement>, targetCompany: Company) => {
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

  return {
    companies,
    drawerVisible,
    editing,
    loading,
    orderingSaving,
    draggingCompanyId,
    syncingCompanyId,
    form,
    openCreate,
    openEdit,
    closeEditor,
    submit,
    triggerSync,
    handleDragStart,
    handleDragEnd: () => setDraggingCompanyId(null),
    handleDrop
  };
}
