import { listCompanies } from "@/server/db/repositories/companies";
import { DepartmentsConsole } from "@/features/departments/DepartmentsConsole";
import { DashboardPageFrame } from "@/features/shell/DashboardPageFrame";
import { requirePageAuth } from "@/server/auth/guards";

export default async function DepartmentsPage() {
  await requirePageAuth();
  return (
    <DashboardPageFrame>
      <DepartmentsConsole companies={listCompanies().map(({ id, name }) => ({ id, name }))} />
    </DashboardPageFrame>
  );
}
