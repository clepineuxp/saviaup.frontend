import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { Expense } from '../models/expense.model';
import { mapExpenseDtoToModel } from './expense.adapter';
import {
  AnnulExpensePayload,
  CreateExpensePayload,
  ExpenseDto,
  ExpensePageDto,
  UpdateExpensePayload,
} from './expense.contracts';
import { ExpensePageResult, ExpenseQueryFilters, ExpenseRepository } from './expense.repository';

@Injectable({
  providedIn: 'root',
})
export class HttpExpenseRepository implements ExpenseRepository {
  private readonly api = inject(ApiClient);

  getPage(filters: ExpenseQueryFilters): Observable<ExpensePageResult> {
    const queryParams: Record<string, string | number | boolean> = {
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    };

    if (filters.fromDate?.trim()) queryParams['fromDate'] = filters.fromDate.trim();
    if (filters.toDate?.trim()) queryParams['toDate'] = filters.toDate.trim();
    if (filters.search?.trim()) queryParams['search'] = filters.search.trim();
    if (filters.supplierId?.trim()) queryParams['supplierId'] = filters.supplierId.trim();
    if (filters.status?.trim()) queryParams['status'] = filters.status.trim();
    if (filters.paymentMethod?.trim()) queryParams['paymentMethod'] = filters.paymentMethod.trim();
    if (filters.isCashOut !== undefined && filters.isCashOut !== null) {
      queryParams['isCashOut'] = filters.isCashOut;
    }

    return this.api
      .get<ExpensePageDto>(API_ENDPOINTS.expenses.root, { params: queryParams })
      .pipe(
        map((dto) => ({
          items: dto.items.map(mapExpenseDtoToModel),
          page: dto.page,
          pageSize: dto.pageSize,
          totalCount: dto.totalCount,
          totalPages: dto.totalPages,
        }))
      );
  }

  create(payload: CreateExpensePayload): Observable<Expense> {
    return this.api
      .post<ExpenseDto, CreateExpensePayload>(API_ENDPOINTS.expenses.root, payload)
      .pipe(map(mapExpenseDtoToModel));
  }

  update(expenseId: string, payload: UpdateExpensePayload): Observable<Expense> {
    return this.api
      .put<ExpenseDto, UpdateExpensePayload>(
        API_ENDPOINTS.expenses.detail(expenseId),
        payload
      )
      .pipe(map(mapExpenseDtoToModel));
  }

  annul(expenseId: string, payload: AnnulExpensePayload): Observable<Expense> {
    return this.api
      .post<ExpenseDto, AnnulExpensePayload>(
        API_ENDPOINTS.expenses.annul(expenseId),
        payload
      )
      .pipe(map(mapExpenseDtoToModel));
  }
}
