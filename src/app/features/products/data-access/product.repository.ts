import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  ProductPage,
  ProductQuery,
  SetProductStatusRequest,
  UpdateProductRequest,
} from '../models/product.model';

export interface ProductRepository {
  list(query: ProductQuery): Observable<ProductPage>;
  listCategories(): Observable<readonly ProductCategory[]>;
  create(request: CreateProductRequest): Observable<Product>;
  update(productId: string, request: UpdateProductRequest): Observable<Product>;
  setStatus(productId: string, request: SetProductStatusRequest): Observable<Product>;
  delete(productId: string): Observable<void>;
}

export const PRODUCT_REPOSITORY = new InjectionToken<ProductRepository>('PRODUCT_REPOSITORY');
