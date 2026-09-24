export const DEFAULT_PAGE_SIZE = 12;
/** Larger requested page sizes are capped to this. */
export const MAX_PAGE_SIZE = 48;

/** One page of a paginated list. `page` is 1-based; pages past the end have no items. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
