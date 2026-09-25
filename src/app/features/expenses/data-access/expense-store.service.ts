import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../../shared/http/api-error';
import { Expense } from '../models/expense.model';
import {
  AnnulExpensePayload,
  CreateExpensePayload,
  UpdateExpensePayload,
} from './expense.contracts';
import { HttpExpenseRepository } from './http-expense.repository';
import { ExpenseQueryFilters } from './expense.repository';
import { SortDirection, sortByValue } from '../../../shared/utils/sorting';

export type ExpenseSortColumn =
  | 'consecutiveNumber'
  | 'date'
  | 'name'
  | 'supplier'
  | 'paymentMethod'
  | 'origin'
  | 'amount'
  | 'status';

@Injectable({
  providedIn: 'root',
})
export class ExpenseStoreService {
  private readonly organizationTime = inject(OrganizationTime);
  private readonly repository = inject(HttpExpenseRepository);

  private getTodayString(): string {
    return this.organizationTime.localDate();
  }

  readonly items = signal<Expense[]>([]);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(25);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lockFinancialFieldsAfterCreation = signal<boolean>(true);

  readonly fromDateFilter = signal<string>(this.getTodayString());
  readonly toDateFilter = signal<string>(this.getTodayString());
  readonly searchFilter = signal<string>('');
  readonly supplierIdFilter = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly paymentMethodFilter = signal<string>('ALL');
  readonly isCashOutFilter = signal<boolean | undefined>(undefined);
  readonly sortColumn = signal<ExpenseSortColumn>('consecutiveNumber');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly expenses = computed(() =>
    sortByValue(this.items(), this.sortDirection(), (expense) => {
      switch (this.sortColumn()) {
        case 'consecutiveNumber':
          return expense.consecutiveNumber;
        case 'date':
          return Date.parse(expense.businessDate ?? expense.expenseDate);
        case 'name':
          return expense.name;
        case 'supplier':
          return expense.supplier?.name;
        case 'paymentMethod':
          return expense.paymentMethod;
        case 'origin':
          return expense.isCashOut;
        case 'amount':
          return expense.amount;
        case 'status':
          return expense.status;
      }
    }),
  );
  readonly errorMessage = computed(() => this.error());
  readonly mutating = computed(() => this.loading());
  readonly canCreate = signal<boolean>(true);
  readonly canEdit = signal<boolean>(true);
  readonly canAnnul = signal<boolean>(true);
  readonly hasItems = computed(() => this.items().length > 0);

  readonly totalAmount = computed(() =>
    this.items()
      .filter((e) => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + e.amount, 0),
  );

  readonly totalCashOutAmount = computed(() =>
    this.items()
      .filter((e) => e.status === 'ACTIVE' && e.isCashOut)
      .reduce((sum, e) => sum + e.amount, 0),
  );

  loadEditingPolicy(): void {
    this.repository.getEditingPolicy().subscribe({
      next: (policy) =>
        this.lockFinancialFieldsAfterCreation.set(policy.lockFinancialFieldsAfterCreation),
      error: () => this.lockFinancialFieldsAfterCreation.set(true),
    });
  }

  loadPage(page: number = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);

    const fromStr = this.fromDateFilter() || undefined;
    const toStr = this.toDateFilter() || undefined;

    const filters: ExpenseQueryFilters = {
      fromDate: fromStr,
      toDate: toStr,
      search: this.searchFilter(),
      supplierId: this.supplierIdFilter() || undefined,
      status: this.statusFilter() === 'ALL' ? undefined : this.statusFilter(),
      paymentMethod: this.paymentMethodFilter() === 'ALL' ? undefined : this.paymentMethodFilter(),
      isCashOut: this.isCashOutFilter(),
      page,
      pageSize: this.pageSize(),
    };

    this.repository.getPage(filters).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.getErrorMessage(err, 'Error al cargar lista de gastos.'));
        this.loading.set(false);
      },
    });
  }

  setFilters(
    fromDate: string,
    toDate: string,
    search: string,
    supplierId: string,
    status: string,
    paymentMethod: string,
    isCashOut?: boolean,
  ): void {
    this.fromDateFilter.set(fromDate);
    this.toDateFilter.set(toDate);
    this.searchFilter.set(search);
    this.supplierIdFilter.set(supplierId);
    this.statusFilter.set(status);
    this.paymentMethodFilter.set(paymentMethod);
    this.isCashOutFilter.set(isCashOut);
    this.loadPage(1);
  }

  setPageSize(pageSize: number): void {
    const supportedPageSizes = [10, 25, 50, 100];
    const normalizedPageSize = Number(pageSize);
    if (!supportedPageSizes.includes(normalizedPageSize)) return;

    this.pageSize.set(normalizedPageSize);
    this.loadPage(1);
  }

  sortBy(column: ExpenseSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  sortIndicator(column: ExpenseSortColumn): string {
    if (this.sortColumn() !== column) return '↕';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  createExpense(payload: CreateExpensePayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.create(payload).subscribe({
      next: () => {
        this.loadPage(1);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(this.getErrorMessage(err, 'Error al registrar el gasto.'));
        this.loading.set(false);
      },
    });
  }

  updateExpense(expenseId: string, payload: UpdateExpensePayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.update(expenseId, payload).subscribe({
      next: () => {
        this.loadPage(this.page());
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(this.getErrorMessage(err, 'Error al actualizar el gasto.'));
        this.loading.set(false);
      },
    });
  }

  annulExpense(expenseId: string, payload: AnnulExpensePayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.annul(expenseId, payload).subscribe({
      next: () => {
        this.loadPage(this.page());
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(this.getErrorMessage(err, 'Error al anular el gasto.'));
        this.loading.set(false);
      },
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}
