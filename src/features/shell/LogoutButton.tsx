"use client";

import { Button, Message } from "@arco-design/web-react";
import { IconExport } from "@arco-design/web-react/icon";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    Message.success("已退出");
    router.replace("/login");
  };

  return <Button icon={<IconExport />} onClick={logout} />;
}
