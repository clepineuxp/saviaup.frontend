export type ProductType = 'NORMAL' | 'COMBO';

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface ProductRecipeItem {
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

export interface ProductRecipeItemRequest {
  readonly ingredientId: string | null;
  readonly customIngredientName: string | null;
  readonly quantity: number;
  readonly notes: string | null;
  readonly order?: number;
}

export interface ProductIngredientLookup {
  readonly id: string;
  readonly name: string;
  readonly categoryName?: string;
  readonly measurementUnit: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  };
  readonly currentStock: number;
  readonly isActive: boolean;
}

export interface Product {
  readonly id: string;
  readonly type: ProductType;
  readonly name: string;
  readonly description: string | null;
  readonly image: string | null;
  readonly category: ProductCategory;
  readonly salePrice: number;
  readonly preparationTimeMinutes: number | null;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdByUserName?: string | null;
  readonly lastModifiedByUserName?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly recipe: readonly ProductRecipeItem[];
}

export interface ProductPage {
  readonly items: readonly Product[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface ProductQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | null;
  readonly categoryId: string | null;
  readonly type: ProductType | null;
  readonly includeInactive: boolean;
}

export interface CreateProductRequest {
  readonly type: ProductType;
  readonly name: string;
  readonly categoryId: string;
  readonly salePrice: number;
  readonly description: string | null;
  readonly image: string | null;
  readonly preparationTimeMinutes: number | null;
  readonly isInventoryTracked: boolean;
  readonly recipe?: readonly ProductRecipeItemRequest[];
}

export type UpdateProductRequest = CreateProductRequest;

export interface SetProductStatusRequest {
  readonly isActive: boolean;
}

export const EMPTY_PRODUCT_PAGE = (): ProductPage => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 0,
});
