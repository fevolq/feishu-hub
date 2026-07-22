export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginationMeta = PaginationParams & {
  total: number;
};

export type PaginatedResult<T> = PaginationMeta & {
  items: T[];
};

export const DEFAULT_PAGE_SIZE = 20;
export const COMPACT_PAGE_SIZE = 10;

export const getPaginationOffset = ({ page, pageSize }: PaginationParams) =>
  (page - 1) * pageSize;
