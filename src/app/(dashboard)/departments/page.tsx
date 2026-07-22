import { listCompanies } from "@/modules/companies/server/repository";
import { DepartmentsConsole } from "@/modules/organization/ui/DepartmentsConsole";

export default async function DepartmentsPage() {
  return <DepartmentsConsole companies={listCompanies().map(({ id, name }) => ({ id, name }))} />;
}
