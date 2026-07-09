"use client";

import { Drawer, Form, Input, Switch, type FormInstance } from "@arco-design/web-react";
import type { Company, CompanyFormValues } from "./types";

type CompanyEditorDrawerProps = {
  visible: boolean;
  editing: Company | null;
  loading: boolean;
  form: FormInstance<CompanyFormValues>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
};

export function CompanyEditorDrawer({
  visible,
  editing,
  loading,
  form,
  onSubmit,
  onCancel
}: CompanyEditorDrawerProps) {
  return (
    <Drawer
      title={editing ? "编辑公司" : "新增公司"}
      visible={visible}
      width={520}
      confirmLoading={loading}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical">
        <Form.Item field="name" label="公司名称" rules={[{ required: true, message: "请输入公司名称" }]}>
          <Input placeholder="例如：上海主体" />
        </Form.Item>
        <Form.Item field="appId" label="APP_ID" rules={[{ required: true, message: "请输入 APP_ID" }]}>
          <Input placeholder="cli_xxx" />
        </Form.Item>
        <Form.Item field="appSecret" label="APP_SECRET" rules={[{ required: true, message: "请输入 APP_SECRET" }]}>
          <Input.Password placeholder="飞书应用密钥" />
        </Form.Item>
        <Form.Item field="enabled" label="启用公司" triggerPropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
