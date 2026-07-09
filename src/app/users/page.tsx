import { listCompanies } from "@/server/db/repositories/companies";
import { UsersConsole } from "@/features/users/UsersConsole";
import { DashboardPageFrame } from "@/features/shell/DashboardPageFrame";
import { requirePageAuth } from "@/server/auth/guards";

export default async function UsersPage() {
  await requirePageAuth();
  return (
    <DashboardPageFrame>
      <UsersConsole companies={listCompanies().map(({ id, name }) => ({ id, name }))} />
    </DashboardPageFrame>
  );
}
