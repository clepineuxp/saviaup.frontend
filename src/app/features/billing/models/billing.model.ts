export interface BillingReceiptItem {
  readonly receiptId: string;
  readonly receiptNumber: number;
  readonly receiptType: string;
  readonly title: string;
  readonly orderId: string;
  readonly orderNumber: number;
  readonly tableId?: string;
  readonly tableName: string;
  readonly issuedByUserId: string;
  readonly issuedByUserName: string;
  readonly paidByUserName?: string;
  readonly paymentMethod?: string;
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly tipAmount: number;
  readonly totalAmount: number;
  readonly createdAt: string;
  readonly itemsCount: number;
}

export interface PaymentSplit {
  readonly method: string;
  readonly amount: number;
}

export interface OrderReceiptItem {
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly subtotal: number;
}

export interface OrderReceipt {
  readonly id: string;
  readonly tenantId: string;
  readonly orderId: string;
  readonly receiptNumber: number;
  readonly receiptType: string;
  readonly title: string;
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly tipAmount: number;
  readonly totalAmount: number;
  readonly paymentMethod?: string | null;
  readonly paymentDetails?: readonly PaymentSplit[] | null;
  readonly items: readonly OrderReceiptItem[];
  readonly issuedByUserId: string;
  readonly issuedByUserName: string;
  readonly paidByUserName?: string | null;
  readonly createdAt: string;
}

export interface BillingOrder {
  readonly orderId: string;
  readonly orderNumber: number;
  readonly tableId?: string;
  readonly tableName: string;
  readonly status: string;
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly tipAmount: number;
  readonly totalAmount: number;
  readonly paymentMethod?: string;
  readonly createdByUserName: string;
  readonly paidByUserName?: string;
  readonly paidAt?: string;
  readonly createdAt: string;
  readonly receiptsCount: number;
  readonly receipts: readonly OrderReceipt[];
}

export interface BillingReceiptQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}
