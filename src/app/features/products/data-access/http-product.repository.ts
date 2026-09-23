import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  ProductIngredientLookup,
  ProductPage,
  ProductQuery,
  SetProductStatusRequest,
  UpdateProductRequest,
} from '../models/product.model';
import {
  mapProduct,
  mapProductCategory,
  mapProductIngredient,
  mapProductPage,
} from './product.adapter';
import {
  IngredientPageResponseDto,
  ProductCategoryLookupDto,
  ProductDto,
  ProductPageDto,
} from './product.contracts';
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

  listComboCandidates(search?: string): Observable<readonly Product[]> {
    const query: ProductQuery = {
      page: 1,
      pageSize: 100,
      search: search?.trim() || null,
      categoryId: null,
      type: 'NORMAL',
      includeInactive: false,
    };

    return this.list(query).pipe(
      expand((page) =>
        page.page < page.totalPages ? this.list({ ...query, page: page.page + 1 }) : EMPTY,
      ),
      reduce<ProductPage, readonly Product[]>((products, page) => [...products, ...page.items], []),
    );
  }

  listCategories(onlyWithProducts = false): Observable<readonly ProductCategory[]> {
    return this.api
      .get<readonly ProductCategoryLookupDto[]>(API_ENDPOINTS.categories.root, {
        params: { includeInactive: false, onlyWithProducts },
      })
      .pipe(map((categories) => categories.map(mapProductCategory)));
  }

  listIngredients(
    search?: string,
    page = 1,
    pageSize = 10,
  ): Observable<readonly ProductIngredientLookup[]> {
    return this.api
      .get<IngredientPageResponseDto>(API_ENDPOINTS.inventory.ingredients.root, {
        params: compactParams({
          page,
          pageSize,
          search: search?.trim() || null,
          includeInactive: false,
        }),
      })
      .pipe(map((res) => (res.items ?? []).map(mapProductIngredient)));
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
