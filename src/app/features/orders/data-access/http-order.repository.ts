import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { PagedResponse } from '../../../shared/models/paged-response.model';
import { RestaurantTable } from '../../tables/models/table.model';
import {
  AddOrderItemsRequest,
  CancelOrderItemRequest,
  CheckoutOrderRequest,
  MoveTableOrderRequest,
  Order,
  OrderQueryRequest,
} from '../models/order.model';
import { OrderRepository } from './order.repository';

@Injectable({ providedIn: 'root' })
export class HttpOrderRepository implements OrderRepository {
  private readonly api = inject(ApiClient);

  listOrders(request: OrderQueryRequest): Observable<PagedResponse<Order>> {
    let params = new HttpParams()
      .set('page', (request.page ?? 1).toString())
      .set('pageSize', (request.pageSize ?? 25).toString());

    if (request.search?.trim()) {
      params = params.set('search', request.search.trim());
    }

    if (request.statuses && request.statuses.length > 0) {
      request.statuses.forEach((s) => {
        params = params.append('statuses', s);
      });
    }

    if (request.fromDate) {
      params = params.set('fromDate', request.fromDate);
    }

    if (request.toDate) {
      params = params.set('toDate', request.toDate);
    }

    if (request.tableId) {
      params = params.set('tableId', request.tableId);
    }

    return this.api.get<PagedResponse<Order>>(API_ENDPOINTS.orders.root, { params });
  }

  getActiveByTable(tableId: string): Observable<Order> {
    return this.api.get<Order>(API_ENDPOINTS.orders.activeByTable(tableId));
  }

  addItems(tableId: string, request: AddOrderItemsRequest): Observable<Order> {
    return this.api.post<Order>(API_ENDPOINTS.orders.addItems(tableId), request);
  }

  moveTable(tableId: string, request: MoveTableOrderRequest): Observable<RestaurantTable> {
    return this.api.post<RestaurantTable>(API_ENDPOINTS.orders.moveTable(tableId), request);
  }

  cancelItem(itemId: string, request: CancelOrderItemRequest): Observable<Order> {
    return this.api.post<Order>(API_ENDPOINTS.orders.cancelItem(itemId), request);
  }

  checkout(tableId: string, request: CheckoutOrderRequest): Observable<Order> {
    return this.api.post<Order>(API_ENDPOINTS.orders.checkout(tableId), request);
  }
}
