export interface ProductCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface ProductRecipeItemDto {
  readonly id: string;
  readonly ingredientId: string | null;
  readonly ingredientName: string | null;
  readonly measurementUnitName: string | null;
  readonly measurementUnitCode: string | null;
  readonly customIngredientName: string | null;
  readonly quantity: number;
  readonly notes: string | null;
  readonly order: number;
  readonly isLinked: boolean;
}

export interface ProductIngredientDto {
  readonly id: string;
  readonly name: string;
  readonly category?: {
    readonly id: string;
    readonly name: string;
  };
  readonly unit?: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  };
  readonly measurementUnit?: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  };
  readonly currentStock?: number;
  readonly isActive?: boolean;
}

export interface ProductVariationDto {
  readonly id: string;
  readonly name: string;
  readonly salePrice: number;
  readonly order: number;
  readonly isActive: boolean;
}

export interface ProductComboOptionDto {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productVariationId?: string | null;
  readonly productVariationName?: string | null;
  readonly productQuantity: number;
  readonly priceAdjustment: number;
  readonly order: number;
}

export interface ProductComboGroupDto {
  readonly id: string;
  readonly name: string;
  readonly selectionType: 'SINGLE' | 'MULTIPLE' | 'FIXED';
  readonly isRequired: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly order: number;
  readonly options: readonly ProductComboOptionDto[];
}

export interface ProductDto {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly description: string | null;
  readonly image: string | null;
  readonly category: ProductCategoryDto;
  readonly salePrice: number | null;
  readonly preparationTimeMinutes: number | null;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly recipe?: readonly ProductRecipeItemDto[];
  readonly variations?: readonly ProductVariationDto[];
  readonly comboGroups?: readonly ProductComboGroupDto[];
}

export interface ProductPageDto {
  readonly items: readonly ProductDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface ProductCategoryLookupDto {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface IngredientPageResponseDto {
  readonly items: readonly ProductIngredientDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}
