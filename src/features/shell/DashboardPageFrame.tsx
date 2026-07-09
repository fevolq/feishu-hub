import type { ReactNode } from "react";
import { AppShell } from "@/features/shell/AppShell";

export function DashboardPageFrame({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
