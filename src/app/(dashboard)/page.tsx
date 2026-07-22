import { listCompanyOverviewCards } from "@/modules/overview/server/repository";
import { OverviewConsole } from "@/modules/overview/ui/OverviewConsole";

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export default async function DashboardPage() {
  const since = sevenDaysAgo();
  const companies = listCompanyOverviewCards(since);

  return companies.length ? (
    <OverviewConsole companies={companies} since={since} />
  ) : (
    <div className="work-surface">暂无公司主体</div>
  );
}
