import { listCompanyOverviewCards } from "@/server/db/repositories/overview";
import { DashboardPageFrame } from "@/features/shell/DashboardPageFrame";
import { requirePageAuth } from "@/server/auth/guards";

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export default async function DashboardPage() {
  await requirePageAuth();
  const companies = listCompanyOverviewCards(sevenDaysAgo());

  return (
    <DashboardPageFrame>
      <div className="page-head">
        <div>
          <h1 className="page-title">概览</h1>
        </div>
      </div>
      {companies.length ? (
        <div className="company-overview-grid">
          {companies.map((company) => (
            <section className="company-overview-card" key={company.id}>
              <h2 className="company-overview-name">{company.name}</h2>
              <div className="company-overview-metrics">
                <div className="company-overview-metric">
                  <span className="company-overview-metric-label">人员数量</span>
                  <strong className="company-overview-metric-value">{company.employeeCount}</strong>
                </div>
                <div className="company-overview-metric">
                  <span className="company-overview-metric-label">近 7 天入职人数</span>
                  <strong className="company-overview-metric-value">{company.recentJoinedCount}</strong>
                </div>
                <div className="company-overview-metric">
                  <span className="company-overview-metric-label">近 7 天离职人数</span>
                  <strong className="company-overview-metric-value">{company.recentResignedCount}</strong>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="work-surface">暂无公司主体</div>
      )}
    </DashboardPageFrame>
  );
}
