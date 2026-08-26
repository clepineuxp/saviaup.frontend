import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatisticsService } from '../data-access/statistics.service';
import {
  ProductQuantityPoint,
  ProductValuePoint,
  StatisticsDashboardData,
  StatisticsPeriod,
} from '../models/statistics.model';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement
);

const COLOR_PALETTE = [
  '#22c55e', // Savia Emerald
  '#3b82f6', // Sapphire
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate (Others)
];

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsPageComponent implements OnInit {
  private readonly statisticsService = inject(StatisticsService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('salesCanvas') salesCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsCanvas') productsCanvas?: ElementRef<HTMLCanvasElement>;

  private salesChartInstance?: Chart;
  private productsChartInstance?: Chart;

  readonly isLoading = signal<boolean>(true);
  readonly period = signal<StatisticsPeriod>('current_month');
  readonly includeTips = signal<boolean>(false);
  readonly productMetricMode = signal<'quantity' | 'value'>('quantity');

  readonly dashboardData = signal<StatisticsDashboardData | null>(null);
  readonly selectedPointDetail = signal<{ title: string; subtitle: string; sales: number; count: number } | null>(null);

  // Sales by User Max
  readonly salesByUserMax = computed<number>(() => {
    const data = this.dashboardData();
    if (!data || data.salesByUser.length === 0) return 1;
    return Math.max(...data.salesByUser.map((u) => u.totalSales), 1);
  });

  // Monthly Comparison Max
  readonly monthlyComparisonBars = computed(() => {
    const data = this.dashboardData();
    if (!data || data.monthlyComparison.length === 0) return [];
    const max = Math.max(...data.monthlyComparison.map((m) => m.sales), 1);

    return data.monthlyComparison.map((m) => ({
      ...m,
      heightPercent: max > 0 ? Math.max(Math.round((m.sales / max) * 100), 4) : 4,
    }));
  });

  constructor() {
    effect(() => {
      const data = this.dashboardData();
      const mode = this.productMetricMode();
      if (data) {
        setTimeout(() => {
          this.renderSalesChart(data);
          this.renderProductsChart(data, mode);
        }, 50);
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  setPeriod(newPeriod: StatisticsPeriod): void {
    if (this.period() === newPeriod) return;
    this.period.set(newPeriod);
    this.selectedPointDetail.set(null);
    this.loadData();
  }

  toggleTips(): void {
    this.includeTips.update((prev) => !prev);
    this.selectedPointDetail.set(null);
    this.loadData();
  }

  setProductMetricMode(mode: 'quantity' | 'value'): void {
    this.productMetricMode.set(mode);
  }

  loadData(): void {
    this.isLoading.set(true);
    this.statisticsService
      .getDashboard(this.period(), this.includeTips())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.dashboardData.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private renderSalesChart(data: StatisticsDashboardData): void {
    if (!this.salesCanvas?.nativeElement) return;

    if (this.salesChartInstance) {
      this.salesChartInstance.destroy();
    }

    const ctx = this.salesCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = data.salesTrend.map((pt) => pt.dayLabel);
    const values = data.salesTrend.map((pt) => pt.sales);
    const ordersCounts = data.salesTrend.map((pt) => pt.ordersCount);
    const dates = data.salesTrend.map((pt) => pt.date);

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

    this.salesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas ($)',
            data: values,
            borderColor: '#22c55e',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#22c55e',
            pointBorderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const dateStr = dates[index];
            const salesVal = values[index];
            const countVal = ordersCounts[index];
            const dayLabel = labels[index];

            this.selectedPointDetail.set({
              title: `Día ${dayLabel} (${dateStr})`,
              subtitle: `${countVal} comandas pagadas`,
              sales: salesVal,
              count: countVal,
            });
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: '#0f172a',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return `Fecha: ${dates[idx]} (Día ${labels[idx]})`;
              },
              label: (context) => {
                const val = context.parsed.y || 0;
                const idx = context.dataIndex;
                const count = ordersCounts[idx];
                const formatted = new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                }).format(val);
                return [`Venta: ${formatted}`, `Comandas: ${count}`];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { weight: 'bold', size: 11 },
              color: '#64748b',
            },
            title: {
              display: true,
              text: 'Días del Período',
              font: { size: 12, weight: 'bold' },
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#e2e8f0' },
            ticks: {
              font: { size: 11 },
              color: '#64748b',
              callback: (val) => {
                if (typeof val === 'number') {
                  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
                  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
                  return `$${val}`;
                }
                return val;
              },
            },
          },
        },
      },
    });
  }

  private renderProductsChart(data: StatisticsDashboardData, mode: 'quantity' | 'value'): void {
    if (!this.productsCanvas?.nativeElement) return;

    if (this.productsChartInstance) {
      this.productsChartInstance.destroy();
    }

    const ctx = this.productsCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const isQty = mode === 'quantity';
    const items = isQty ? data.topProductsByQuantity : data.topProductsByValue;

    const labels = items.map((i) => i.name);
    const values = items.map((i) => (isQty ? (i as ProductQuantityPoint).quantity : (i as ProductValuePoint).amount));
    const percentages = items.map((i) => i.percentage);

    this.productsChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: COLOR_PALETTE.slice(0, items.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 12, weight: 'bold' },
              color: '#0f172a',
              padding: 12,
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: '#0f172a',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                const val = values[idx];
                const pct = percentages[idx];

                if (isQty) {
                  return `${context.label}: ${val} unidades (${pct}%)`;
                } else {
                  const formatted = new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(val);
                  return `${context.label}: ${formatted} (${pct}%)`;
                }
              },
            },
          },
        },
      },
    });
  }
}
