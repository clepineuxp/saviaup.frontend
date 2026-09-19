import {
  Product,
  ProductCategory,
  ProductIngredientLookup,
  ProductPage,
  ProductRecipeItem,
  ProductType,
  ProductVariation,
} from '../models/product.model';
import {
  ProductCategoryDto,
  ProductCategoryLookupDto,
  ProductDto,
  ProductIngredientDto,
  ProductPageDto,
  ProductRecipeItemDto,
  ProductVariationDto,
} from './product.contracts';

export const mapProductCategory = (
  dto: ProductCategoryDto | ProductCategoryLookupDto,
): ProductCategory => ({ ...dto });

export const mapProductRecipeItem = (dto: ProductRecipeItemDto): ProductRecipeItem => ({
  id: dto.id,
  ingredientId: dto.ingredientId ?? null,
  ingredientName: dto.ingredientName ?? null,
  measurementUnitName: dto.measurementUnitName ?? null,
  measurementUnitCode: dto.measurementUnitCode ?? null,
  customIngredientName: dto.customIngredientName ?? null,
  quantity: dto.quantity,
  notes: dto.notes ?? null,
  order: dto.order ?? 0,
  isLinked: Boolean(dto.ingredientId),
});

export const mapProductVariation = (dto: ProductVariationDto): ProductVariation => ({
  id: dto.id,
  name: dto.name,
  salePrice: dto.salePrice,
  order: dto.order ?? 0,
  isActive: dto.isActive ?? true,
});

export const mapProductIngredient = (dto: ProductIngredientDto): ProductIngredientLookup => {
  const unit = dto.unit ?? dto.measurementUnit;
  return {
    id: dto.id,
    name: dto.name,
    categoryName: dto.category?.name,
    measurementUnit: {
      id: unit?.id ?? '',
      code: unit?.code ?? '',
      name: unit?.name ?? '',
    },
    currentStock: dto.currentStock ?? 0,
    isActive: dto.isActive ?? true,
  };
};

export const mapProduct = (dto: ProductDto): Product => ({
  ...dto,
  type: dto.type as ProductType,
  category: mapProductCategory(dto.category),
  recipe: dto.recipe?.map(mapProductRecipeItem) ?? [],
  variations: dto.variations?.map(mapProductVariation) ?? [],
});

export const mapProductPage = (dto: ProductPageDto): ProductPage => ({
  items: dto.items.map(mapProduct),
  page: dto.page,
  pageSize: dto.pageSize,
  totalCount: dto.totalCount,
  totalPages: dto.totalPages,
});
