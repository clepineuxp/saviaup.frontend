import { Product, ProductCategory, ProductPage, ProductType } from '../models/product.model';
import {
  ProductCategoryDto,
  ProductCategoryLookupDto,
  ProductDto,
  ProductPageDto,
} from './product.contracts';

export const mapProductCategory = (
  dto: ProductCategoryDto | ProductCategoryLookupDto,
): ProductCategory => ({ ...dto });

export const mapProduct = (dto: ProductDto): Product => ({
  ...dto,
  type: dto.type as ProductType,
  category: mapProductCategory(dto.category),
});

export const mapProductPage = (dto: ProductPageDto): ProductPage => ({
  items: dto.items.map(mapProduct),
  page: dto.page,
  pageSize: dto.pageSize,
  totalCount: dto.totalCount,
  totalPages: dto.totalPages,
});
