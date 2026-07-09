import { listCompanies } from "@/server/db/repositories/companies";
import { CompaniesConsole } from "@/features/companies/CompaniesConsole";
import { DashboardPageFrame } from "@/features/shell/DashboardPageFrame";
import { requirePageAuth } from "@/server/auth/guards";

export default async function CompaniesPage() {
  await requirePageAuth();
  return (
    <DashboardPageFrame>
      <CompaniesConsole initialCompanies={listCompanies()} />
    </DashboardPageFrame>
  );
}
