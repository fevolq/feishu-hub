import type { ReactNode } from "react";
import { requirePageAuth } from "@/modules/auth/server/guards";
import { LogoutButton } from "@/modules/auth/ui/LogoutButton";
import { AppShell } from "@/shared/ui/shell/AppShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requirePageAuth();
  return <AppShell headerActions={<LogoutButton />}>{children}</AppShell>;
}
