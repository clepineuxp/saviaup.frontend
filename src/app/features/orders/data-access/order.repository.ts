import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { RestaurantTable } from '../../tables/models/table.model';
import {
  AddOrderItemsRequest,
  CancelOrderItemRequest,
  CheckoutOrderRequest,
  MoveTableOrderRequest,
  Order,
} from '../models/order.model';

export interface OrderRepository {
  getActiveByTable(tableId: string): Observable<Order>;
  addItems(tableId: string, request: AddOrderItemsRequest): Observable<Order>;
  moveTable(tableId: string, request: MoveTableOrderRequest): Observable<RestaurantTable>;
  cancelItem(itemId: string, request: CancelOrderItemRequest): Observable<Order>;
  checkout(tableId: string, request: CheckoutOrderRequest): Observable<Order>;
}

export const ORDER_REPOSITORY = new InjectionToken<OrderRepository>('ORDER_REPOSITORY');
