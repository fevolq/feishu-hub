"use client";

import type { CompanyOverviewCard, RecentActivityType } from "../contracts";
import styles from "./OverviewCards.module.css";

export function OverviewCards({
  companies,
  onOpenRecentUsers
}: {
  companies: CompanyOverviewCard[];
  onOpenRecentUsers: (company: CompanyOverviewCard, type: RecentActivityType) => void;
}) {
  return (
    <div className={styles.grid}>
      {companies.map((company) => (
        <section className={styles.card} key={company.id}>
          <h2 className={styles.name}>{company.name}</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>人员数量</span>
              <strong className={styles.metricValue}>{company.employeeCount}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>历史总数量</span>
              <strong className={styles.metricValue}>{company.historyCount}</strong>
            </div>
            <button
              className={`${styles.metric} ${styles.metricAction}`}
              type="button"
              onClick={() => onOpenRecentUsers(company, "joined")}
            >
              <span className={styles.metricLabel}>近 7 天入职人数</span>
              <strong className={styles.metricValue}>{company.recentJoinedCount}</strong>
            </button>
            <button
              className={`${styles.metric} ${styles.metricAction}`}
              type="button"
              onClick={() => onOpenRecentUsers(company, "resigned")}
            >
              <span className={styles.metricLabel}>近 7 天离职人数</span>
              <strong className={styles.metricValue}>{company.recentResignedCount}</strong>
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
