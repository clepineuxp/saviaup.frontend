import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { BillingService } from '../data-access/billing.service';
import { BillingPageComponent } from './billing-page.component';

describe('BillingPageComponent', () => {
  const receipts = vi.fn(() =>
    of({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }),
  );
  const orders = vi.fn(() =>
    of({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }),
  );

  beforeEach(async () => {
    receipts.mockClear();
    orders.mockClear();
    await TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationTime, useValue: { localDate: () => '2026-09-18' } },
        { provide: BillingService, useValue: { getReceipts: receipts, getOrders: orders } },
      ],
    })
      .overrideComponent(BillingPageComponent, { set: { template: '', imports: [] } })
      .compileComponents();
  });

  it('sends organization calendar dates without UTC timestamp suffixes', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    fixture.detectChanges();

    expect(receipts).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: '2026-09-18', toDate: '2026-09-18' }),
    );
  });

  it('uses the same date-only contract for billed orders', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.setTab('orders');

    expect(orders).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: '2026-09-18', toDate: '2026-09-18' }),
    );
  });
});
