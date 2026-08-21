export interface CashRegister {
  readonly id: string;
  readonly name: string;
  readonly location: string | null;
  readonly isActive: boolean;
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
