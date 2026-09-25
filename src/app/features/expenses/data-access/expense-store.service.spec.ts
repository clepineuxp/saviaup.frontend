import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { ExpensePageResult } from './expense.repository';
import { ExpenseStoreService } from './expense-store.service';
import { HttpExpenseRepository } from './http-expense.repository';
import { Expense } from '../models/expense.model';

const expense = (id: string, consecutiveNumber: number, amount: number): Expense => ({
  id,
  consecutiveNumber,
  name: `Gasto ${consecutiveNumber}`,
  description: null,
  amount,
  isCashOut: true,
  paymentMethod: 'Efectivo',
  supplier: null,
  expenseDate: '2026-09-23T12:00:00Z',
  businessDate: '2026-09-23',
  status: 'ACTIVE',
  annulledReason: null,
  annulledAt: null,
  annulledByUserName: null,
  createdByUserName: 'Cajero',
  lastModifiedByUserName: 'Cajero',
  createdAt: '2026-09-23T12:00:00Z',
  updatedAt: '2026-09-23T12:00:00Z',
});

describe('ExpenseStoreService', () => {
  const emptyPage: ExpensePageResult = {
    items: [],
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  };
  let getPage: ReturnType<typeof vi.fn>;
  let getEditingPolicy: ReturnType<typeof vi.fn>;
  let store: ExpenseStoreService;

  beforeEach(() => {
    getPage = vi.fn(() => of(emptyPage));
    getEditingPolicy = vi.fn(() => of({ lockFinancialFieldsAfterCreation: true }));
    TestBed.configureTestingModule({
      providers: [
        ExpenseStoreService,
        {
          provide: OrganizationTime,
          useValue: { localDate: () => '2026-09-23' },
        },
        {
          provide: HttpExpenseRepository,
          useValue: { getPage, getEditingPolicy },
        },
      ],
    });
    store = TestBed.inject(ExpenseStoreService);
  });

  it('loads 25 expenses per page by default', () => {
    store.loadPage(2);

    expect(getPage).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 25 }));
  });

  it('supports 100 expenses per page and returns to the first page', () => {
    store.loadPage(3);
    getPage.mockClear();

    store.setPageSize(100);

    expect(store.pageSize()).toBe(100);
    expect(store.page()).toBe(1);
    expect(getPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 100 }));
  });

  it('ignores unsupported page sizes', () => {
    store.setPageSize(200);

    expect(store.pageSize()).toBe(25);
    expect(getPage).not.toHaveBeenCalled();
  });

  it('loads the organization expense editing policy', () => {
    getEditingPolicy.mockReturnValueOnce(of({ lockFinancialFieldsAfterCreation: false }));

    store.loadEditingPolicy();

    expect(store.lockFinancialFieldsAfterCreation()).toBe(false);
  });

  it('sorts the current expense page ascending and descending', () => {
    store.items.set([expense('expense-2', 2, 90_000), expense('expense-1', 1, 30_000)]);

    store.sortBy('amount');
    expect(store.expenses().map((item) => item.amount)).toEqual([30_000, 90_000]);

    store.sortBy('amount');
    expect(store.expenses().map((item) => item.amount)).toEqual([90_000, 30_000]);
  });
});
