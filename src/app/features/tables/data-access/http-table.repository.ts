import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
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
import { TableRepository } from './table.repository';

@Injectable()
export class HttpTableRepository implements TableRepository {
  private readonly api = inject(ApiClient);

  operationSnapshot(): Observable<TableOperationSnapshot> {
    return this.api.get<TableOperationSnapshot>(API_ENDPOINTS.tables.operation);
  }

  listAreas(): Observable<readonly DiningArea[]> {
    return this.api.get<readonly DiningArea[]>(API_ENDPOINTS.tables.areas.root);
  }

  createArea(request: CreateDiningAreaRequest): Observable<DiningArea> {
    return this.api.post<DiningArea, CreateDiningAreaRequest>(
      API_ENDPOINTS.tables.areas.root,
      request,
    );
  }

  updateArea(areaId: string, request: UpdateDiningAreaRequest): Observable<DiningArea> {
    return this.api.put<DiningArea, UpdateDiningAreaRequest>(
      API_ENDPOINTS.tables.areas.detail(areaId),
      request,
    );
  }

  reorderAreas(areaIds: readonly string[]): Observable<readonly DiningArea[]> {
    return this.api.put<readonly DiningArea[], { readonly areaIds: readonly string[] }>(
      API_ENDPOINTS.tables.areas.reorder,
      { areaIds },
    );
  }

  deleteArea(areaId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.tables.areas.detail(areaId));
  }

  listTables(areaId?: string): Observable<readonly RestaurantTable[]> {
    return this.api.get<readonly RestaurantTable[]>(API_ENDPOINTS.tables.root, {
      params: areaId ? { areaId } : {},
    });
  }

  createTable(request: SaveRestaurantTableRequest): Observable<RestaurantTable> {
    return this.api.post<RestaurantTable, SaveRestaurantTableRequest>(
      API_ENDPOINTS.tables.root,
      request,
    );
  }

  updateTable(tableId: string, request: SaveRestaurantTableRequest): Observable<RestaurantTable> {
    return this.api.put<RestaurantTable, SaveRestaurantTableRequest>(
      API_ENDPOINTS.tables.detail(tableId),
      request,
    );
  }

  deleteTable(tableId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.tables.detail(tableId));
  }

  setOperation(tableId: string, request: SetTableOperationRequest): Observable<RestaurantTable> {
    return this.api.patch<RestaurantTable, SetTableOperationRequest>(
      API_ENDPOINTS.tables.operationState(tableId),
      request,
    );
  }

  updateOrder(tableId: string, request: UpdateTableOrderRequest): Observable<RestaurantTable> {
    return this.api.patch<RestaurantTable, UpdateTableOrderRequest>(
      API_ENDPOINTS.tables.order(tableId),
      request,
    );
  }
}
