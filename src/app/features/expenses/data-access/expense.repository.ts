import { Observable } from 'rxjs';
import { Expense } from '../models/expense.model';
import { AnnulExpensePayload, CreateExpensePayload, UpdateExpensePayload } from './expense.contracts';

export interface ExpensePageResult {
  items: Expense[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ExpenseQueryFilters {
  fromDate?: string;
  toDate?: string;
  search?: string;
  supplierId?: string;
  status?: string;
  paymentMethod?: string;
  isCashOut?: boolean;
  page?: number;
  pageSize?: number;
}

export abstract class ExpenseRepository {
  abstract getPage(filters: ExpenseQueryFilters): Observable<ExpensePageResult>;
  abstract create(payload: CreateExpensePayload): Observable<Expense>;
  abstract update(expenseId: string, payload: UpdateExpensePayload): Observable<Expense>;
  abstract annul(expenseId: string, payload: AnnulExpensePayload): Observable<Expense>;
}
