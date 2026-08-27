import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableMetrics } from '../models/table.model';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';

type MetricsMode = 'day' | 'shift';

@Component({
  selector: 'app-metrics-header',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './metrics-header.component.html',
  styleUrl: './metrics-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsHeaderComponent {
  private readonly contextStore = inject(AuthenticatedContextStore);

  readonly metrics = input.required<TableMetrics>();
  readonly mode = signal<MetricsMode>('day');

  readonly canViewExpenses = computed(() => {
    const options = this.contextStore.options();
    const modules = this.contextStore.modules();
    return (
      modules.some((m) => m.code === 'expenses') ||
      options.some((o) => o.code?.startsWith('expenses') || o.moduleCode === 'expenses')
    );
  });

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

  toggleMode(newMode: MetricsMode): void {
    this.mode.set(newMode);
  }
}
