import {
  DEFAULT_PAGE_SIZE,
  type PaginationParams
} from "@/shared/contracts/pagination";

const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parsePaginationParams = (
  searchParams: URLSearchParams,
  defaultPageSize = DEFAULT_PAGE_SIZE
): PaginationParams | null => {
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const pageSize = parsePositiveInteger(searchParams.get("pageSize"), defaultPageSize);

  if (!page || !pageSize || pageSize > MAX_PAGE_SIZE) {
    return null;
  }

  return { page, pageSize };
};
