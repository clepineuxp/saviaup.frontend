import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { ExpensePageResult } from './expense.repository';
import { ExpenseStoreService } from './expense-store.service';
import { HttpExpenseRepository } from './http-expense.repository';

describe('ExpenseStoreService', () => {
  const emptyPage: ExpensePageResult = {
    items: [],
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 0,
  };
  let getPage: ReturnType<typeof vi.fn>;
  let store: ExpenseStoreService;

  beforeEach(() => {
    getPage = vi.fn(() => of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        ExpenseStoreService,
        {
          provide: OrganizationTime,
          useValue: { localDate: () => '2026-09-23' },
        },
        {
          provide: HttpExpenseRepository,
          useValue: { getPage },
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
});
