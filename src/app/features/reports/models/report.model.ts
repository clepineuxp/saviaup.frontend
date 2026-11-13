export type ReportType =
  'STATISTICS' | 'EXPENSES' | 'SALES' | 'SALES_AND_EXPENSES' | 'CASH_REGISTERS';

export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ReportGroupBy = 'COMMANDAS' | 'PRODUCTS';

export type ReportCashFilter = 'ALL' | 'ONLY_CASH_OUT' | 'NO_CASH_OUT';

export type ReportPeriodGrouping = 'NONE' | 'WEEKLY' | 'MONTHLY';

export interface ReportIncludedPeriod {
  readonly label: string;
  readonly range: string;
}

export interface CreateReportRequest {
  readonly reportType: ReportType;
  readonly fromDate?: string | null;
  readonly toDate?: string | null;
  readonly fromLocalDate?: string | null;
  readonly toLocalDate?: string | null;
  readonly includeTips?: boolean;
  readonly groupBy?: ReportGroupBy | null;
  readonly cashFilter?: ReportCashFilter | null;
  readonly periodGrouping?: ReportPeriodGrouping | null;
  readonly includeProducts?: boolean;
  readonly includeTables?: boolean;
  readonly includeWaiters?: boolean;
  readonly includeCategories?: boolean;
}

export interface GeneratedReport {
  readonly id: string;
  readonly reportType: ReportType;
  readonly status: ReportStatus;
  readonly fromDate?: string | null;
  readonly toDate?: string | null;
  readonly parametersJson?: string | null;
  readonly fileName?: string | null;
  readonly fileSizeBytes?: number | null;
  readonly errorMessage?: string | null;
  readonly createdAtUtc: string;
  readonly completedAtUtc?: string | null;
}
