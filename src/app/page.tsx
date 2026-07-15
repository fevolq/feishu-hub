import { listCompanyOverviewCards } from "@/server/db/repositories/overview";
import { OverviewConsole } from "@/features/overview/OverviewConsole";
import { DashboardPageFrame } from "@/features/shell/DashboardPageFrame";
import { requirePageAuth } from "@/server/auth/guards";

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export default async function DashboardPage() {
  await requirePageAuth();
  const since = sevenDaysAgo();
  const companies = listCompanyOverviewCards(since);

  return (
    <DashboardPageFrame>
      {companies.length ? (
        <OverviewConsole companies={companies} since={since} />
      ) : (
        <div className="work-surface">暂无公司主体</div>
      )}
    </DashboardPageFrame>
  );
}
