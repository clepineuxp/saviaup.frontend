import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateDiningAreaRequest,
  DiningArea,
  RestaurantTable,
  SaveRestaurantTableRequest,
  SetTableOperationRequest,
  TableOperationSnapshot,
  UpdateDiningAreaRequest,
  UpdateTableOrderRequest,
} from '../models/table.model';

export interface TableRepository {
  operationSnapshot(): Observable<TableOperationSnapshot>;
  listAreas(): Observable<readonly DiningArea[]>;
  createArea(request: CreateDiningAreaRequest): Observable<DiningArea>;
  updateArea(areaId: string, request: UpdateDiningAreaRequest): Observable<DiningArea>;
  reorderAreas(areaIds: readonly string[]): Observable<readonly DiningArea[]>;
  deleteArea(areaId: string): Observable<void>;
  listTables(areaId?: string): Observable<readonly RestaurantTable[]>;
  createTable(request: SaveRestaurantTableRequest): Observable<RestaurantTable>;
  updateTable(tableId: string, request: SaveRestaurantTableRequest): Observable<RestaurantTable>;
  deleteTable(tableId: string): Observable<void>;
  setOperation(tableId: string, request: SetTableOperationRequest): Observable<RestaurantTable>;
  updateOrder(tableId: string, request: UpdateTableOrderRequest): Observable<RestaurantTable>;
}

export const TABLE_REPOSITORY = new InjectionToken<TableRepository>('TABLE_REPOSITORY');
