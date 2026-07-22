"use client";

import { Message, Pagination, Spin } from "@arco-design/web-react";
import { useEffect, useRef, useState } from "react";
import { COMPACT_PAGE_SIZE, type PaginationMeta } from "@/shared/contracts/pagination";
import { readApiJson } from "@/shared/ui/api-client";
import type { HistoryEvent } from "../contracts";
import styles from "./Organization.module.css";
import { UserHistoryTimeline } from "./UserHistoryTimeline";

type UserHistoryPanelProps = {
  companyId: number | undefined;
  openId: string | undefined;
};

const emptyPagination: PaginationMeta = {
  page: 1,
  pageSize: COMPACT_PAGE_SIZE,
  total: 0
};

export function UserHistoryPanel({ companyId, openId }: UserHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(false);
  const lastSuccessfulPage = useRef(1);

  useEffect(() => {
    lastSuccessfulPage.current = 1;
    setEvents([]);
    setPagination(emptyPagination);
  }, [companyId, openId]);

  useEffect(() => {
    if (!companyId || !openId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setEvents([]);
    setLoading(true);

    const loadHistory = async () => {
      try {
        const params = new URLSearchParams({
          companyId: String(companyId),
          page: String(pagination.page),
          pageSize: String(pagination.pageSize)
        });
        const response = await fetch(
          `/api/users/${encodeURIComponent(openId)}/history?${params}`,
          { signal: controller.signal }
        );
        const body = await readApiJson<{
          events?: HistoryEvent[];
          pagination?: PaginationMeta;
        }>(response, "加载历史失败");
        const nextPagination = body.pagination || emptyPagination;
        lastSuccessfulPage.current = nextPagination.page;
        setEvents(body.events || []);
        setPagination(nextPagination);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEvents([]);
        setPagination((current) => ({ ...current, page: lastSuccessfulPage.current }));
        Message.error(error instanceof Error ? error.message : "加载历史失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadHistory();
    return () => controller.abort();
  }, [companyId, openId, pagination.page, pagination.pageSize]);

  if (loading) {
    return (
      <div className={styles.historyLoading}>
        <Spin />
      </div>
    );
  }

  return (
    <>
      <UserHistoryTimeline events={events} />
      {pagination.total > pagination.pageSize ? (
        <Pagination
          current={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showTotal
          sizeCanChange={false}
          onChange={(page) => setPagination((current) => ({ ...current, page }))}
        />
      ) : null}
    </>
  );
}
