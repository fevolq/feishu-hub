import { listCompanies } from "@/modules/companies/server/repository";
import { UsersConsole } from "@/modules/organization/ui/UsersConsole";

export default async function UsersPage() {
  return <UsersConsole companies={listCompanies().map(({ id, name }) => ({ id, name }))} />;
}
