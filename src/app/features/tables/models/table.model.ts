export type RestaurantTableStatus = 'AVAILABLE' | 'OCCUPIED' | 'DISABLED';
export type RestaurantTableShape =
  'SQUARE' | 'ROUND' | 'RECTANGLE_HORIZONTAL' | 'RECTANGLE_VERTICAL';
export type TableViewMode = 'room' | 'icons';

export interface DiningArea {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RestaurantTable {
  readonly id: string;
  readonly diningAreaId: string;
  readonly name: string;
  readonly capacity: number;
  readonly positionX: number;
  readonly positionY: number;
  readonly shape: RestaurantTableShape;
  readonly isDelivery: boolean;
  readonly isCashRegister: boolean;
  readonly status: RestaurantTableStatus;
  readonly activeOrderId: string | null;
  readonly activeOrderTotal: number;
  readonly occupiedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DiningAreaTables {
  readonly area: DiningArea;
  readonly tables: readonly RestaurantTable[];
}

export interface TableMetrics {
  readonly available: number;
  readonly occupied: number;
  readonly activeSalesTotal: number;
  readonly todaySalesTotal?: number;
  readonly todayExpensesTotal?: number;
  readonly openShiftSalesTotal?: number;
  readonly openShiftExpensesTotal?: number;
}

export interface CashRegisterGate {
  readonly requiresOpenShift: boolean;
  readonly hasOpenShift: boolean;
  readonly isInteractionBlocked: boolean;
}

export interface TableOperationSnapshot {
  readonly areas: readonly DiningAreaTables[];
  readonly metrics: TableMetrics;
  readonly cashRegister: CashRegisterGate;
}

export interface CreateDiningAreaRequest {
  readonly name: string;
  readonly order: number;
  readonly isActive: boolean;
}

export type UpdateDiningAreaRequest = CreateDiningAreaRequest;

export interface SaveRestaurantTableRequest {
  readonly diningAreaId: string;
  readonly name: string;
  readonly capacity: number;
  readonly positionX: number;
  readonly positionY: number;
  readonly shape: RestaurantTableShape;
  readonly isDelivery: boolean;
  readonly isCashRegister: boolean;
  readonly status: RestaurantTableStatus;
}

export interface SetTableOperationRequest {
  readonly status: 'AVAILABLE' | 'OCCUPIED';
  readonly activeOrderId?: string | null;
  readonly activeOrderTotal?: number;
}

export interface UpdateTableOrderRequest {
  readonly activeOrderId: string;
  readonly total: number;
}

export interface TableStatusChangedEvent {
  readonly table: RestaurantTable;
  readonly isDeleted: boolean;
}

export interface TableOrderUpdatedEvent {
  readonly tableId: string;
  readonly activeOrderId: string;
  readonly total: number;
  readonly updatedAt: string;
}
