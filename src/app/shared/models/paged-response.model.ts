export interface PagedResponse<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}
