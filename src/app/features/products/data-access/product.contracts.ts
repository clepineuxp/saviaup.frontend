export interface ProductCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly isInventoryTracked: boolean;
}

export interface ProductDto {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly description: string | null;
  readonly image: string | null;
  readonly category: ProductCategoryDto;
  readonly salePrice: number;
  readonly preparationTimeMinutes: number | null;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
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
