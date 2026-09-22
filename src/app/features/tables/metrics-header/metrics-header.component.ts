import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableMetrics } from '../models/table.model';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';

type MetricsMode = 'day' | 'shift';
type SummaryCard = 'table-sales' | 'period-sales' | 'expenses' | 'balance';

@Component({
  selector: 'app-metrics-header',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './metrics-header.component.html',
  styleUrl: './metrics-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsHeaderComponent {
  private readonly contextStore = inject(AuthenticatedContextStore);
  private readonly router = inject(Router);

  readonly metrics = input.required<TableMetrics>();
  readonly mode = signal<MetricsMode>('day');
  readonly pendingSummary = signal<SummaryCard | null>(null);

  readonly canViewOrders = computed(() => this.hasAvailableModule('orders'));

  readonly canViewStatistics = computed(() => this.hasAvailableModule('statistics'));

  readonly canViewExpenses = computed(() => this.hasAvailableModule('expenses'));

  readonly totalTables = computed(() => {
    const m = this.metrics();
    return m.available + m.occupied;
  });

  readonly salesValue = computed(() => {
    const m = this.metrics();
    if (this.mode() === 'shift') {
      return (m.openShiftSalesTotal ?? 0) + m.activeSalesTotal;
    }
    return (m.todaySalesTotal ?? 0) + m.activeSalesTotal;
  });

  readonly expensesValue = computed(() => {
    const m = this.metrics();
    if (this.mode() === 'shift') {
      return m.openShiftExpensesTotal ?? 0;
    }
    return m.todayExpensesTotal ?? 0;
  });

  readonly balanceValue = computed(() => this.salesValue() - this.expensesValue());

  toggleMode(newMode: MetricsMode): void {
    this.mode.set(newMode);
  }

  onSummaryCardClick(card: SummaryCard, event: Event): void {
    if (!this.canNavigateTo(card)) return;

    event.preventDefault();
    if (this.pendingSummary() === card) {
      this.pendingSummary.set(null);
      void this.router.navigate([this.summaryRoute(card)]);
      return;
    }

    this.pendingSummary.set(card);
  }

  @HostListener('document:click', ['$event'])
  closeSummaryNavigationOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.metric--summary-link')) {
      this.pendingSummary.set(null);
    }
  }

  private hasAvailableModule(moduleCode: string): boolean {
    return (
      this.contextStore.modules().some((module) => module.code === moduleCode) ||
      this.contextStore
        .options()
        .some((option) => option.moduleCode === moduleCode || option.code?.startsWith(moduleCode))
    );
  }

  private canNavigateTo(card: SummaryCard): boolean {
    switch (card) {
      case 'table-sales':
      case 'period-sales':
        return this.canViewOrders();
      case 'expenses':
        return this.canViewExpenses();
      case 'balance':
        return this.canViewStatistics();
    }
  }

  private summaryRoute(card: SummaryCard): string {
    switch (card) {
      case 'table-sales':
      case 'period-sales':
        return '/app/orders';
      case 'expenses':
        return '/app/expenses';
      case 'balance':
        return '/app/statistics';
    }
  }
}
