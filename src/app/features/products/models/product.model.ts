export type ProductType = 'NORMAL' | 'COMBO';

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
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
