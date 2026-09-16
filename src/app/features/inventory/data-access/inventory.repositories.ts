import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CategoryReference,
  CreateIngredientRequest,
  CreateInventoryMovementRequest,
  CreateMeasurementUnitRequest,
  Ingredient,
  IngredientQuery,
  InventoryItem,
  InventoryMovement,
  InventoryMovementQuery,
  InventoryQuery,
  MeasurementUnit,
  MeasurementUnitQuery,
  PagedResponse,
  SetIngredientStatusRequest,
  SetMeasurementUnitStatusRequest,
  UpdateIngredientRequest,
  UpdateMeasurementUnitRequest,
} from '../models/inventory.model';

export interface StockRepository {
  list(query: InventoryQuery): Observable<PagedResponse<InventoryItem>>;
}

export interface IngredientRepository {
  list(query: IngredientQuery): Observable<PagedResponse<Ingredient>>;
  listCategories(): Observable<readonly CategoryReference[]>;
  create(request: CreateIngredientRequest): Observable<Ingredient>;
  update(ingredientId: string, request: UpdateIngredientRequest): Observable<Ingredient>;
  setStatus(ingredientId: string, request: SetIngredientStatusRequest): Observable<Ingredient>;
  delete(ingredientId: string): Observable<void>;
}

export interface MovementRepository {
  list(query: InventoryMovementQuery): Observable<PagedResponse<InventoryMovement>>;
  create(request: CreateInventoryMovementRequest): Observable<InventoryMovement>;
}

export interface MeasurementUnitRepository {
  list(query: MeasurementUnitQuery): Observable<PagedResponse<MeasurementUnit>>;
  create(request: CreateMeasurementUnitRequest): Observable<MeasurementUnit>;
  update(unitId: string, request: UpdateMeasurementUnitRequest): Observable<MeasurementUnit>;
  setStatus(unitId: string, request: SetMeasurementUnitStatusRequest): Observable<MeasurementUnit>;
  delete(unitId: string): Observable<void>;
}

export const STOCK_REPOSITORY = new InjectionToken<StockRepository>('STOCK_REPOSITORY');
export const INGREDIENT_REPOSITORY = new InjectionToken<IngredientRepository>(
  'INGREDIENT_REPOSITORY',
);
export const MOVEMENT_REPOSITORY = new InjectionToken<MovementRepository>('MOVEMENT_REPOSITORY');
export const MEASUREMENT_UNIT_REPOSITORY = new InjectionToken<MeasurementUnitRepository>(
  'MEASUREMENT_UNIT_REPOSITORY',
);
