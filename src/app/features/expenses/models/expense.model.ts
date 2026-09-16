export interface ExpenseSupplier {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  consecutiveNumber: number;
  name: string;
  description: string | null;
  amount: number;
  isCashOut: boolean;
  paymentMethod: string;
  supplier: ExpenseSupplier | null;
  expenseDate: string;
  status: 'ACTIVE' | 'ANNULLED';
  annulledReason: string | null;
  annulledAt: string | null;
  annulledByUserName: string | null;
  createdByUserName: string;
  lastModifiedByUserName: string;
  createdAt: string;
  updatedAt: string;
}
