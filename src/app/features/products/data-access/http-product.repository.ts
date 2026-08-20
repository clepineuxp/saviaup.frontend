import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  ProductPage,
  ProductQuery,
  SetProductStatusRequest,
  UpdateProductRequest,
} from '../models/product.model';
import { mapProduct, mapProductCategory, mapProductPage } from './product.adapter';
import { ProductCategoryLookupDto, ProductDto, ProductPageDto } from './product.contracts';
import { ProductRepository } from './product.repository';

const compactParams = <T extends object>(
  values: T,
): Readonly<Record<string, string | number | boolean>> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== '')
      .map(([key, value]) => [key, value as string | number | boolean]),
  );

@Injectable()
export class HttpProductRepository implements ProductRepository {
  private readonly api = inject(ApiClient);

  list(query: ProductQuery): Observable<ProductPage> {
    return this.api
      .get<ProductPageDto>(API_ENDPOINTS.products.root, { params: compactParams(query) })
      .pipe(map(mapProductPage));
  }

  listCategories(): Observable<readonly ProductCategory[]> {
    return this.api
      .get<readonly ProductCategoryLookupDto[]>(API_ENDPOINTS.categories.root, {
        params: { includeInactive: false },
      })
      .pipe(map((categories) => categories.map(mapProductCategory)));
  }

  create(request: CreateProductRequest): Observable<Product> {
    return this.api
      .post<ProductDto, CreateProductRequest>(API_ENDPOINTS.products.root, request)
      .pipe(map(mapProduct));
  }

  update(productId: string, request: UpdateProductRequest): Observable<Product> {
    return this.api
      .put<ProductDto, UpdateProductRequest>(API_ENDPOINTS.products.detail(productId), request)
      .pipe(map(mapProduct));
  }

  setStatus(productId: string, request: SetProductStatusRequest): Observable<Product> {
    return this.api
      .patch<ProductDto, SetProductStatusRequest>(API_ENDPOINTS.products.status(productId), request)
      .pipe(map(mapProduct));
  }

  delete(productId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.products.detail(productId));
  }
}
