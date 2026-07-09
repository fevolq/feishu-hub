"use client";

import { Button, Form, Input, Message } from "@arco-design/web-react";
import { IconLock } from "@arco-design/web-react/icon";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiJson } from "@/lib/api-client";

export function LoginForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    const values = (await form.validate()) as { password: string };
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      await readApiJson(response, "登录失败", { redirectOnUnauthorized: false });
      Message.success("登录成功");
      router.replace("/");
      router.refresh();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onSubmit={submit}>
      <Form.Item field="password" label="访问密码" rules={[{ required: true, message: "请输入访问密码" }]}>
        <Input.Password prefix={<IconLock />} placeholder="请输入访问密码" />
      </Form.Item>
      <Button long type="primary" htmlType="submit" loading={loading}>
        登录
      </Button>
    </Form>
  );
}
