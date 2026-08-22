import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RestaurantTable } from '../../tables/models/table.model';
import { PagedResponse } from '../../../shared/models/paged-response.model';
import {
  AddOrderItemsRequest,
  CancelOrderItemRequest,
  CheckoutOrderRequest,
  MoveTableOrderRequest,
  Order,
  OrderItemReport,
  OrderQueryRequest,
} from '../models/order.model';

export interface OrderRepository {
  listOrders(request: OrderQueryRequest): Observable<PagedResponse<Order>>;
  listOrderItems(request: OrderQueryRequest): Observable<PagedResponse<OrderItemReport>>;
  getActiveByTable(tableId: string): Observable<Order>;
  addItems(tableId: string, request: AddOrderItemsRequest): Observable<Order>;
  moveTable(tableId: string, request: MoveTableOrderRequest): Observable<RestaurantTable>;
  cancelItem(itemId: string, request: CancelOrderItemRequest): Observable<Order>;
  checkout(tableId: string, request: CheckoutOrderRequest): Observable<Order>;
}

export const ORDER_REPOSITORY = new InjectionToken<OrderRepository>('ORDER_REPOSITORY');
