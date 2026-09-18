import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { OrganizationDatePipe } from '../../../shared/pipes/organization-date.pipe';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ThermalTicketModalComponent } from '../../../shared/components/thermal-ticket-modal/thermal-ticket-modal.component';
import { BillingService } from '../data-access/billing.service';
import {
  BillingOrder,
  BillingReceiptItem,
  BillingReceiptQuery,
  OrderReceipt,
  PagedResult,
} from '../models/billing.model';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    OrganizationDatePipe,
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    ThermalTicketModalComponent,
  ],
  templateUrl: './billing-page.component.html',
  styleUrl: './billing-page.component.scss',
})
export class BillingPageComponent implements OnInit {
  private readonly organizationTime = inject(OrganizationTime);
  private readonly billingService = inject(BillingService);

  readonly activeTab = signal<'receipts' | 'orders'>('receipts');
  readonly searchQuery = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(25);

  readonly receiptsData = signal<PagedResult<BillingReceiptItem> | null>(null);
  readonly ordersData = signal<PagedResult<BillingOrder> | null>(null);
  readonly loading = signal<boolean>(false);
  readonly selectedReceipt = signal<OrderReceipt | null>(null);
  readonly selectedOrder = signal<BillingOrder | null>(null);

  ngOnInit(): void {
    const today = this.organizationTime.localDate();
    this.fromDate.set(today);
    this.toDate.set(today);
    this.loadData();
  }

  setTab(tab: 'receipts' | 'orders'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    this.loadData();
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadData();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1) return;
    this.page.set(newPage);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const query: BillingReceiptQuery = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchQuery().trim() || undefined,
      // The API resolves these calendar dates in the organization's IANA time zone.
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
    };

    if (this.activeTab() === 'receipts') {
      this.billingService.getReceipts(query).subscribe({
        next: (data) => {
          this.receiptsData.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.billingService.getOrders(query).subscribe({
        next: (data) => {
          this.ordersData.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  openReceiptModal(receiptId: string): void {
    this.billingService.getReceiptById(receiptId).subscribe({
      next: (receipt) => this.selectedReceipt.set(receipt),
    });
  }

  openOrderReceiptsModal(order: BillingOrder): void {
    this.selectedOrder.set(order);
  }

  closeModal(): void {
    this.selectedReceipt.set(null);
    this.selectedOrder.set(null);
  }

  printTicket(): void {
    window.print();
  }
}
