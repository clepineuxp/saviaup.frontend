import { Category } from '../models/category.model';
import { CategoryDto } from './category.contracts';

export const mapCategoryDto = (dto: CategoryDto): Category => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  imageUrl: dto.imageUrl,
  isInventoryTracked: dto.isInventoryTracked,
  isActive: dto.isActive,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});
