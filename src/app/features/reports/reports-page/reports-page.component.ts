import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDatePipe } from '../../../shared/pipes/organization-date.pipe';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { ReportStoreService } from '../data-access/report-store.service';
import {
  GeneratedReport,
  ReportCashFilter,
  ReportGroupBy,
  ReportPeriodGrouping,
  ReportType,
} from '../models/report.model';

@Component({
  selector: 'app-reports-page',
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    OrganizationDatePipe,
    UiAlertComponent,
    UiButtonComponent,
  ],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent implements OnInit {
  readonly store = inject(ReportStoreService);

  readonly reportTypes: readonly {
    readonly type: ReportType;
    readonly icon: string;
    readonly labelKey: string;
    readonly descKey: string;
  }[] = [
    {
      type: 'STATISTICS',
      icon: '📊',
      labelKey: 'reports.type.statistics',
      descKey: 'reports.type.statisticsDesc',
    },
    {
      type: 'EXPENSES',
      icon: '💸',
      labelKey: 'reports.type.expenses',
      descKey: 'reports.type.expensesDesc',
    },
    {
      type: 'SALES',
      icon: '🛒',
      labelKey: 'reports.type.sales',
      descKey: 'reports.type.salesDesc',
    },
    {
      type: 'SALES_AND_EXPENSES',
      icon: '⚖️',
      labelKey: 'reports.type.salesAndExpenses',
      descKey: 'reports.type.salesAndExpensesDesc',
    },
    {
      type: 'CASH_REGISTERS',
      icon: '🏦',
      labelKey: 'reports.type.cashRegisters',
      descKey: 'reports.type.cashRegistersDesc',
    },
  ];

  ngOnInit(): void {
    this.store.loadReports();
  }

  onSelectType(type: ReportType): void {
    this.store.setReportType(type);
  }

  onPresetClick(preset: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth'): void {
    this.store.setDateRangePreset(preset);
  }

  onGroupByChange(groupBy: ReportGroupBy): void {
    this.store.groupBy.set(groupBy);
  }

  onCashFilterChange(filter: ReportCashFilter): void {
    this.store.cashFilter.set(filter);
  }

  onPeriodGroupingChange(grouping: ReportPeriodGrouping): void {
    this.store.periodGrouping.set(grouping);
  }

  generateReport(): void {
    this.store.requestReport();
  }

  downloadReport(report: GeneratedReport): void {
    this.store.downloadReport(report);
  }

  refreshList(): void {
    this.store.loadReports();
  }

  formatFileSize(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }

  getParameterTags(report: GeneratedReport): string[] {
    const tags: string[] = [];
    if (!report.parametersJson) return tags;

    try {
      const parsed = JSON.parse(report.parametersJson);
      if (parsed.groupBy) {
        tags.push(parsed.groupBy === 'COMMANDAS' ? 'Por comandas' : 'Por productos');
      }
      if (parsed.cashFilter) {
        if (parsed.cashFilter === 'ONLY_CASH_OUT') tags.push('Solo caja');
        else if (parsed.cashFilter === 'NO_CASH_OUT') tags.push('Sin salida de caja');
        else tags.push('Todos los gastos');
      }
      if (parsed.periodGrouping) {
        if (parsed.periodGrouping === 'WEEKLY') tags.push('Por semanas');
        else if (parsed.periodGrouping === 'MONTHLY') tags.push('Por meses');
      }
      if (parsed.includeProducts === true) tags.push('Productos');
      if (parsed.includeTables === true) tags.push('Mesas');
      if (parsed.includeWaiters === true) tags.push('Meseros');
      if (parsed.includeCategories === true) tags.push('Categorías');
    } catch {
      // Ignore json parse error
    }

    return tags;
  }
}
