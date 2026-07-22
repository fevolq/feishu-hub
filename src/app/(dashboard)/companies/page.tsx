import {
  listCompanies,
  toPublicCompanies
} from "@/modules/companies/server/repository";
import { CompaniesConsole } from "@/modules/companies/ui/CompaniesConsole";

export default async function CompaniesPage() {
  return <CompaniesConsole initialCompanies={toPublicCompanies(listCompanies())} />;
}
