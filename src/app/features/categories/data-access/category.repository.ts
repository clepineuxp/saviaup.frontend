import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Category,
  CreateCategoryRequest,
  SetCategoryStatusRequest,
  UpdateCategoryRequest,
} from '../models/category.model';

export interface CategoryRepository {
  list(includeInactive: boolean): Observable<readonly Category[]>;
  create(request: CreateCategoryRequest): Observable<Category>;
  update(categoryId: string, request: UpdateCategoryRequest): Observable<Category>;
  setStatus(categoryId: string, request: SetCategoryStatusRequest): Observable<Category>;
  delete(categoryId: string): Observable<void>;
}

export const CATEGORY_REPOSITORY = new InjectionToken<CategoryRepository>('CATEGORY_REPOSITORY');
