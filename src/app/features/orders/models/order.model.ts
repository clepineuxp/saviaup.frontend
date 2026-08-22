export type OrderItemStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string | null;
  readonly productName: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly subtotal: number;
  readonly status: OrderItemStatus;
  readonly notes: string | null;
  readonly isCustomSale: boolean;
  readonly cancellationReason: string | null;
  readonly cancelledAt: string | null;
  readonly cancelledByUserId: string | null;
  readonly cancelledByUserName: string | null;
  readonly createdByUserId: string;
  readonly createdByUserName: string;
  readonly lastModifiedByUserId: string | null;
  readonly lastModifiedByUserName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Order {
  readonly id: string;
  readonly tenantId: string;
  readonly tableId: string | null;
  readonly tableName: string | null;
  readonly orderNumber: number;
  readonly status: 'PENDING' | 'PAID' | 'CANCELLED';
  readonly subtotalAmount: number;
  readonly taxAmount: number;
  readonly tipAmount: number;
  readonly totalAmount: number;
  readonly paymentMethod: string | null;
  readonly paymentDetailsJson: string | null;
  readonly observations: string | null;
  readonly createdByUserId: string;
  readonly createdByUserName: string;
  readonly lastModifiedByUserId: string | null;
  readonly lastModifiedByUserName: string | null;
  readonly paidByUserId: string | null;
  readonly paidByUserName: string | null;
  readonly paidAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly OrderItem[];
}

export interface OrderQueryRequest {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string | null;
  readonly statuses?: readonly string[] | null;
  readonly fromDate?: string | null;
  readonly toDate?: string | null;
  readonly tableId?: string | null;
}

export interface CreateOrderItem {
  readonly productId?: string | null;
  readonly productName: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly notes?: string | null;
  readonly isCustomSale: boolean;
}

export interface AddOrderItemsRequest {
  readonly items: readonly CreateOrderItem[];
  readonly observations?: string | null;
}

export interface MoveTableOrderRequest {
  readonly targetTableId: string;
}

export interface CancelOrderItemRequest {
  readonly reason: string;
}

export interface PaymentSplit {
  readonly method: string;
  readonly amount: number;
}

export interface PartialItemPay {
  readonly itemId: string;
  readonly quantity: number;
}

export interface CheckoutOrderRequest {
  readonly paymentMethod: string;
  readonly splits?: readonly PaymentSplit[];
  readonly tipAmount?: number;
  readonly itemsToPay?: readonly PartialItemPay[];
}
