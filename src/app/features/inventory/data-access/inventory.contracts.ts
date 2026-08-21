export interface PagedResponseDto<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface CategoryReferenceDto {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface MeasurementUnitDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryItemDto {
  readonly id: string;
  readonly itemType: string;
  readonly name: string;
  readonly category: CategoryReferenceDto;
  readonly unit: MeasurementUnitDto;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly isBelowMinimum: boolean;
}

export interface IngredientDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: CategoryReferenceDto;
  readonly unit: MeasurementUnitDto;
  readonly minimumStock: number;
  readonly currentStock: number;
  readonly isBelowMinimum: boolean;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryMovementDto {
  readonly id: string;
  readonly ingredientId: string;
  readonly ingredientName: string;
  readonly unit: MeasurementUnitDto;
  readonly direction: string;
  readonly reason: string;
  readonly quantity: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly note: string | null;
  readonly createdByUserId: string;
  readonly createdAt: string;
}

export interface CategoryLookupDto {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}
