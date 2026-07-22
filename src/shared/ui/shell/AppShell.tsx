"use client";

import { Layout } from "@arco-design/web-react";
import {
  IconApps,
  IconBranch,
  IconDashboard,
  IconUserGroup
} from "@arco-design/web-react/icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";

const { Sider, Header, Content } = Layout;
const NAVIGATION_TIMEOUT_MS = 10_000;

const navItems = [
  { key: "/", label: "概览", icon: <IconDashboard /> },
  { key: "/users", label: "员工列表", icon: <IconUserGroup /> },
  { key: "/departments", label: "部门树", icon: <IconBranch /> },
  { key: "/companies", label: "公司主体", icon: <IconApps /> }
];

export function AppShell({
  children,
  headerActions
}: {
  children: ReactNode;
  headerActions?: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const selected = navItems.find((item) => item.key !== "/" && pathname.startsWith(item.key))?.key || "/";
  const isNavigating = Boolean(pendingKey);

  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPendingKey(null), NAVIGATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [pendingKey]);

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
      setPendingKey(null);
      return;
    }

    setPendingKey(href);
  };

  return (
    <Layout className={styles.layout}>
      <Sider className={styles.sider} width={220}>
        <div className={styles.brand}>飞书组织</div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={
                item.key === selected
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
              href={item.key}
              prefetch={false}
              aria-current={item.key === selected ? "page" : undefined}
              onClick={(event) => handleNavClick(event, item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <span>{navItems.find((item) => item.key === selected)?.label}</span>
          {headerActions}
        </Header>
        {isNavigating ? <div className={styles.routeProgress} aria-hidden="true" /> : null}
        <Content className={styles.content} aria-busy={isNavigating}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
