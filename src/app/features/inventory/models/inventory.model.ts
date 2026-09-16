export interface PagedResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface CategoryReference {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface MeasurementUnit {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryItem {
  readonly id: string;
  readonly itemType: string;
  readonly name: string;
  readonly category: CategoryReference;
  readonly unit: MeasurementUnit;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly isBelowMinimum: boolean;
}

export interface Ingredient {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: CategoryReference;
  readonly unit: MeasurementUnit;
  readonly minimumStock: number;
  readonly currentStock: number;
  readonly isBelowMinimum: boolean;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type InventoryMovementDirection = 'increase' | 'decrease';
export type InventoryMovementReason =
  'purchase' | 'production' | 'acquisition' | 'expiration' | 'loss' | 'waste';
export type InventoryMovementRecordedReason = InventoryMovementReason | 'initial';

export interface InventoryMovement {
  readonly id: string;
  readonly ingredientId: string;
  readonly ingredientName: string;
  readonly unit: MeasurementUnit;
  readonly direction: InventoryMovementDirection;
  readonly reason: InventoryMovementRecordedReason;
  readonly quantity: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly note: string | null;
  readonly createdByUserId: string;
  readonly createdAt: string;
}

export interface InventoryQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | null;
  readonly belowMinimum: boolean | null;
}

export interface IngredientQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | null;
  readonly categoryId: string | null;
  readonly includeInactive: boolean;
}

export interface InventoryMovementQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly ingredientId: string | null;
  readonly direction: InventoryMovementDirection | null;
}

export interface MeasurementUnitQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | null;
  readonly includeInactive: boolean;
}

export interface CreateIngredientRequest {
  readonly categoryId: string;
  readonly measurementUnitId: string;
  readonly name: string;
  readonly description: string | null;
  readonly minimumStock: number;
  readonly initialStock: number;
}

export interface UpdateIngredientRequest {
  readonly categoryId: string;
  readonly measurementUnitId: string;
  readonly name: string;
  readonly description: string | null;
  readonly minimumStock: number;
}

export interface SetIngredientStatusRequest {
  readonly isActive: boolean;
}

export interface CreateInventoryMovementRequest {
  readonly ingredientId: string;
  readonly direction: InventoryMovementDirection;
  readonly reason: InventoryMovementReason;
  readonly quantity: number;
  readonly note: string | null;
}

export interface CreateMeasurementUnitRequest {
  readonly code: string;
  readonly name: string;
}

export type UpdateMeasurementUnitRequest = CreateMeasurementUnitRequest;

export interface SetMeasurementUnitStatusRequest {
  readonly isActive: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;

export const EMPTY_PAGE = <T>(): PagedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 0,
});
