import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  Category,
  CreateCategoryRequest,
  SetCategoryStatusRequest,
  UpdateCategoryRequest,
} from '../models/category.model';
import { mapCategoryDto } from './category.adapter';
import { CategoryDto } from './category.contracts';
import { CategoryRepository } from './category.repository';

@Injectable()
export class HttpCategoryRepository implements CategoryRepository {
  private readonly api = inject(ApiClient);

  list(includeInactive: boolean): Observable<readonly Category[]> {
    return this.api
      .get<readonly CategoryDto[]>(API_ENDPOINTS.categories.root, {
        params: { includeInactive },
      })
      .pipe(map((categories) => categories.map(mapCategoryDto)));
  }

  create(request: CreateCategoryRequest): Observable<Category> {
    return this.api
      .post<CategoryDto, CreateCategoryRequest>(API_ENDPOINTS.categories.root, request)
      .pipe(map(mapCategoryDto));
  }

  update(categoryId: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.api
      .put<CategoryDto, UpdateCategoryRequest>(API_ENDPOINTS.categories.detail(categoryId), request)
      .pipe(map(mapCategoryDto));
  }

  setStatus(categoryId: string, request: SetCategoryStatusRequest): Observable<Category> {
    return this.api
      .patch<CategoryDto, SetCategoryStatusRequest>(
        API_ENDPOINTS.categories.status(categoryId),
        request,
      )
      .pipe(map(mapCategoryDto));
  }

  delete(categoryId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.categories.detail(categoryId));
  }
}
