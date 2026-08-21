import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CategoryReference,
  CreateIngredientRequest,
  Ingredient,
  IngredientQuery,
  PagedResponse,
  SetIngredientStatusRequest,
  UpdateIngredientRequest,
} from '../models/inventory.model';
import { mapCategoryReference, mapIngredient, mapPage } from './inventory.adapter';
import { CategoryLookupDto, IngredientDto, PagedResponseDto } from './inventory.contracts';
import { compactParams } from './inventory-query-params';
import { IngredientRepository } from './inventory.repositories';

@Injectable()
export class HttpIngredientRepository implements IngredientRepository {
  private readonly api = inject(ApiClient);

  list(query: IngredientQuery): Observable<PagedResponse<Ingredient>> {
    return this.api
      .get<PagedResponseDto<IngredientDto>>(API_ENDPOINTS.inventory.ingredients.root, {
        params: compactParams(query),
      })
      .pipe(map((page) => mapPage(page, mapIngredient)));
  }

  listCategories(): Observable<readonly CategoryReference[]> {
    return this.api
      .get<readonly CategoryLookupDto[]>(API_ENDPOINTS.categories.root, {
        params: { includeInactive: false },
      })
      .pipe(map((categories) => categories.map(mapCategoryReference)));
  }

  create(request: CreateIngredientRequest): Observable<Ingredient> {
    return this.api
      .post<IngredientDto, CreateIngredientRequest>(
        API_ENDPOINTS.inventory.ingredients.root,
        request,
      )
      .pipe(map(mapIngredient));
  }

  update(ingredientId: string, request: UpdateIngredientRequest): Observable<Ingredient> {
    return this.api
      .put<IngredientDto, UpdateIngredientRequest>(
        API_ENDPOINTS.inventory.ingredients.detail(ingredientId),
        request,
      )
      .pipe(map(mapIngredient));
  }

  setStatus(ingredientId: string, request: SetIngredientStatusRequest): Observable<Ingredient> {
    return this.api
      .patch<IngredientDto, SetIngredientStatusRequest>(
        API_ENDPOINTS.inventory.ingredients.status(ingredientId),
        request,
      )
      .pipe(map(mapIngredient));
  }

  delete(ingredientId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.inventory.ingredients.detail(ingredientId));
  }
}
