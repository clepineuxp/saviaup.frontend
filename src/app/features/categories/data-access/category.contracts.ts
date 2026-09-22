export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly image: string | null;
  readonly isInventoryTracked: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly productCount?: number;
  readonly variationCount?: number;
  readonly ingredientCount?: number;
}
