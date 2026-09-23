export interface ExpenseSupplierDto {
  id: string;
  name: string;
}

export interface ExpenseDto {
  id: string;
  consecutiveNumber: number;
  name: string;
  description: string | null;
  amount: number;
  isCashOut: boolean;
  paymentMethod: string;
  supplier: ExpenseSupplierDto | null;
  expenseDate: string;
  businessDate?: string | null;
  status: 'ACTIVE' | 'ANNULLED';
  annulledReason: string | null;
  annulledAt: string | null;
  annulledByUserName: string | null;
  createdByUserName: string;
  lastModifiedByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  name: string;
  description?: string | null;
  amount: number;
  isCashOut: boolean;
  paymentMethod: string;
  supplierId?: string | null;
  expenseDate?: string | null;
  businessDate?: string | null;
}

export interface UpdateExpensePayload {
  name: string;
  description?: string | null;
  paymentMethod: string;
  supplierId?: string | null;
}

export interface AnnulExpensePayload {
  reason?: string | null;
}

export interface ExpensePageDto {
  items: ExpenseDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
