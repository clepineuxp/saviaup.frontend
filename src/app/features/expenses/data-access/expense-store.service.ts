import { Injectable, computed, inject, signal } from '@angular/core';
import { Expense } from '../models/expense.model';
import { AnnulExpensePayload, CreateExpensePayload, UpdateExpensePayload } from './expense.contracts';
import { HttpExpenseRepository } from './http-expense.repository';
import { ExpenseQueryFilters } from './expense.repository';

@Injectable({
  providedIn: 'root',
})
export class ExpenseStoreService {
  private readonly repository = inject(HttpExpenseRepository);

  private getTodayString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  readonly items = signal<Expense[]>([]);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly fromDateFilter = signal<string>(this.getTodayString());
  readonly toDateFilter = signal<string>(this.getTodayString());
  readonly searchFilter = signal<string>('');
  readonly supplierIdFilter = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly paymentMethodFilter = signal<string>('ALL');
  readonly isCashOutFilter = signal<boolean | undefined>(undefined);

  readonly expenses = computed(() => this.items());
  readonly errorMessage = computed(() => this.error());
  readonly mutating = computed(() => this.loading());
  readonly canCreate = signal<boolean>(true);
  readonly canEdit = signal<boolean>(true);
  readonly canAnnul = signal<boolean>(true);
  readonly hasItems = computed(() => this.items().length > 0);

  readonly totalAmount = computed(() =>
    this.items()
      .filter((e) => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + e.amount, 0)
  );

  readonly totalCashOutAmount = computed(() =>
    this.items()
      .filter((e) => e.status === 'ACTIVE' && e.isCashOut)
      .reduce((sum, e) => sum + e.amount, 0)
  );

  loadPage(page: number = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);

    const fromStr = this.fromDateFilter() ? new Date(`${this.fromDateFilter()}T00:00:00`).toISOString() : undefined;
    const toStr = this.toDateFilter() ? new Date(`${this.toDateFilter()}T23:59:59.999`).toISOString() : undefined;

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
        this.error.set(err?.error?.message || 'Error al cargar lista de gastos.');
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
    isCashOut?: boolean
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

  createExpense(payload: CreateExpensePayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.create(payload).subscribe({
      next: () => {
        this.loadPage(1);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al registrar el gasto.');
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
        this.error.set(err?.error?.message || 'Error al actualizar el gasto.');
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
        this.error.set(err?.error?.message || 'Error al anular el gasto.');
        this.loading.set(false);
      },
    });
  }
}
