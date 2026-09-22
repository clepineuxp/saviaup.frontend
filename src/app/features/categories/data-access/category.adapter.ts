import { Category } from '../models/category.model';
import { CategoryDto } from './category.contracts';

export const mapCategoryDto = (dto: CategoryDto): Category => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  image: dto.image,
  isInventoryTracked: dto.isInventoryTracked,
  isActive: dto.isActive,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  productCount: dto.productCount ?? 0,
  variationCount: dto.variationCount ?? 0,
  ingredientCount: dto.ingredientCount ?? 0,
});
