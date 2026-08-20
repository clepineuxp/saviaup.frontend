export interface Category {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCategoryRequest {
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly isInventoryTracked: boolean;
}

export type UpdateCategoryRequest = CreateCategoryRequest;

export interface SetCategoryStatusRequest {
  readonly isActive: boolean;
}
