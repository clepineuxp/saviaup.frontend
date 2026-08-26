export type StatisticsPeriod = 'current_month' | 'last_30_days';

export interface TopSeller {
  readonly userId: string;
  readonly name: string;
  readonly totalSales: number;
  readonly ordersCount: number;
}

export interface SummaryStatistics {
  readonly totalSales: number;
  readonly totalOrdersCount: number;
  readonly averageTicket: number;
  readonly totalTips: number;
  readonly topSeller: TopSeller | null;
}

export interface DailySalesPoint {
  readonly date: string;
  readonly dayLabel: string;
  readonly sales: number;
  readonly tips: number;
  readonly ordersCount: number;
}

export interface ProductQuantityPoint {
  readonly productId: string | null;
  readonly name: string;
  readonly quantity: number;
  readonly percentage: number;
}

export interface ProductValuePoint {
  readonly productId: string | null;
  readonly name: string;
  readonly amount: number;
  readonly percentage: number;
}

export interface MonthlyComparisonPoint {
  readonly year: number;
  readonly month: number;
  readonly monthLabel: string;
  readonly sales: number;
}

export interface UserSalesSummary {
  readonly userId: string;
  readonly name: string;
  readonly totalSales: number;
  readonly ordersCount: number;
  readonly isTopSeller: boolean;
}

export interface StatisticsDashboardData {
  readonly period: StatisticsPeriod;
  readonly includeTips: boolean;
  readonly summary: SummaryStatistics;
  readonly salesTrend: readonly DailySalesPoint[];
  readonly topProductsByQuantity: readonly ProductQuantityPoint[];
  readonly topProductsByValue: readonly ProductValuePoint[];
  readonly monthlyComparison: readonly MonthlyComparisonPoint[];
  readonly salesByUser: readonly UserSalesSummary[];
}
