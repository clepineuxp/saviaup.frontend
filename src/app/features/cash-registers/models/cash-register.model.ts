export interface CashRegister {
  readonly id: string;
  readonly name: string;
  readonly location: string | null;
  readonly isActive: boolean;
  readonly hasOpenShift?: boolean;
  readonly activeShiftId?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCashRegisterRequest {
  readonly name: string;
  readonly location?: string | null;
  readonly isActive?: boolean;
}

export interface UpdateCashRegisterRequest {
  readonly name: string;
  readonly location?: string | null;
  readonly isActive: boolean;
}

export interface SetCashRegisterStatusRequest {
  readonly isActive: boolean;
}

export interface OpeningBalanceInput {
  readonly methodName: string;
  readonly amount: number;
}

export interface OpenCashRegisterShiftRequest {
  readonly cashRegisterId: string;
  readonly initialBalances?: readonly OpeningBalanceInput[];
}

export interface ClosingBalanceInput {
  readonly methodName: string;
  readonly actualAmount: number;
}

export interface CloseCashRegisterShiftRequest {
  readonly closingBalances?: readonly ClosingBalanceInput[];
}

export interface PaymentMethodClosingSummary {
  readonly methodName: string;
  readonly initialOpeningAmount: number;
  readonly salesCollectedAmount: number;
  readonly tipsCollectedAmount?: number;
  readonly expensesAmount: number;
  readonly totalCollectedAmount?: number;
  readonly expectedTotalAmount: number;
  readonly actualAmount?: number;
  readonly differenceAmount?: number;
}

export interface CashRegisterShiftSummary {
  readonly shiftId: string;
  readonly cashRegisterId: string;
  readonly cashRegisterName: string;
  readonly status: string;
  readonly openedByUserName: string;
  readonly openedAt: string;
  readonly totalSalesAmount: number;
  readonly totalTipsAmount: number;
  readonly totalCollectedAmount: number;
  readonly totalExpensesAmount: number;
  readonly methodSummaries: readonly PaymentMethodClosingSummary[];
}

export interface CashRegisterShift {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly cashRegisterName: string;
  readonly status: string;
  readonly openedByUserId: string;
  readonly openedByUserName: string;
  readonly openedAt: string;
  readonly closedByUserId?: string | null;
  readonly closedByUserName?: string | null;
  readonly closedAt?: string | null;
  readonly totalSalesAmount: number;
  readonly totalTipsAmount: number;
  readonly totalCollectedAmount: number;
  readonly totalExpensesAmount: number;
  readonly openingBalancesJson: string;
  readonly closingSummaryJson?: string | null;
}

export interface CashRegisterShiftQueryRequest {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cashRegisterId?: string | null;
  readonly status?: string | null;
}
