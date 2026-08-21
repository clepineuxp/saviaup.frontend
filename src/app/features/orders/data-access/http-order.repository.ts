import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { RestaurantTable } from '../../tables/models/table.model';
import {
  AddOrderItemsRequest,
  CancelOrderItemRequest,
  CheckoutOrderRequest,
  MoveTableOrderRequest,
  Order,
} from '../models/order.model';
import { OrderRepository } from './order.repository';

@Injectable({ providedIn: 'root' })
export class HttpOrderRepository implements OrderRepository {
  private readonly api = inject(ApiClient);

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
