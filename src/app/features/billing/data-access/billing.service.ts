import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  BillingOrder,
  BillingReceiptItem,
  BillingReceiptQuery,
  OrderReceipt,
  PagedResult,
} from '../models/billing.model';

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  private readonly api = inject(ApiClient);

  getReceipts(query: BillingReceiptQuery): Observable<PagedResult<BillingReceiptItem>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);

    return this.api.get<PagedResult<BillingReceiptItem>>('/api/billing/receipts', { params });
  }

  getOrders(query: BillingReceiptQuery): Observable<PagedResult<BillingOrder>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);

    return this.api.get<PagedResult<BillingOrder>>('/api/billing/orders', { params });
  }

  getReceiptById(id: string): Observable<OrderReceipt> {
    return this.api.get<OrderReceipt>(`/api/billing/receipts/${id}`);
  }
}
