"use client";

import { Layout } from "@arco-design/web-react";
import {
  IconApps,
  IconBranch,
  IconDashboard,
  IconUserGroup
} from "@arco-design/web-react/icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { LogoutButton } from "@/features/shell/LogoutButton";

const { Sider, Header, Content } = Layout;

const navItems = [
  { key: "/", label: "概览", icon: <IconDashboard /> },
  { key: "/users", label: "员工列表", icon: <IconUserGroup /> },
  { key: "/departments", label: "部门树", icon: <IconBranch /> },
  { key: "/companies", label: "公司主体", icon: <IconApps /> }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const selected = navItems.find((item) => item.key !== "/" && pathname.startsWith(item.key))?.key || "/";
  const activeKey = pendingKey || selected;
  const isNavigating = isPending || Boolean(pendingKey);

  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      href === selected
    ) {
      return;
    }

    event.preventDefault();
    setPendingKey(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Layout className="app-layout">
      <Sider className="app-sider" width={220}>
        <div className="app-brand">飞书组织后台</div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={item.key === activeKey ? "app-nav-link app-nav-link-active" : "app-nav-link"}
              href={item.key}
              prefetch
              aria-current={item.key === activeKey ? "page" : undefined}
              onClick={(event) => handleNavClick(event, item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </Sider>
      <Layout>
        <Header className="app-header">
          <span>{navItems.find((item) => item.key === activeKey)?.label}</span>
          <LogoutButton />
        </Header>
        {isNavigating ? <div className="route-progress" aria-hidden="true" /> : null}
        <Content className="app-content" aria-busy={isNavigating}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
