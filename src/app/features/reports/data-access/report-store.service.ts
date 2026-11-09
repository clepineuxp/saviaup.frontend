import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, exhaustMap, finalize, interval, takeWhile } from 'rxjs';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import {
  CreateReportRequest,
  GeneratedReport,
  ReportCashFilter,
  ReportGroupBy,
  ReportIncludedPeriod,
  ReportPeriodGrouping,
  ReportType,
} from '../models/report.model';
import { REPORT_REPOSITORY } from './report.repository';

export function calculateIncludedPeriods(
  fromDateStr: string,
  toDateStr: string,
  grouping: ReportPeriodGrouping,
): readonly ReportIncludedPeriod[] {
  if (!fromDateStr || !toDateStr || grouping === 'NONE' || fromDateStr > toDateStr) {
    return [];
  }

  const [fromY, fromM, fromD] = fromDateStr.split('-').map(Number);
  const [toY, toM, toD] = toDateStr.split('-').map(Number);

  if (!fromY || !fromM || !fromD || !toY || !toM || !toD) {
    return [];
  }

  const start = new Date(fromY, fromM - 1, fromD);
  const end = new Date(toY, toM - 1, toD);

  const formatShort = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const results: ReportIncludedPeriod[] = [];

  if (grouping === 'WEEKLY') {
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const daysUntilSunday = (7 - dayOfWeek) % 7;
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + daysUntilSunday);

      const periodEnd = weekEnd > end ? new Date(end) : weekEnd;
      const weekNum = getIsoWeekNumber(current);
      const range = `${formatShort(current)} - ${formatShort(periodEnd)}`;

      results.push({
        label: `Semana ${weekNum} (${range})`,
        range,
      });

      current.setDate(current.getDate() + daysUntilSunday + 1);
    }
  } else if (grouping === 'MONTHLY') {
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = current.getMonth();
      const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
      const monthEnd = new Date(y, m, lastDayOfMonth);
      const periodEnd = monthEnd > end ? new Date(end) : monthEnd;

      const monthName = monthNames[m];
      const range = `${formatShort(current)} - ${formatShort(periodEnd)}`;

      results.push({
        label: `${monthName} ${y} (${range})`,
        range,
      });

      current.setFullYear(y, m + 1, 1);
    }
  }

  return results;
}

function getIsoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

@Injectable({
  providedIn: 'root',
})
export class ReportStoreService {
  private readonly repository = inject(REPORT_REPOSITORY);
  private readonly organizationTime = inject(OrganizationTime);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cancelActivePolling$ = new Subject<void>();

  // State signals
  readonly reports = signal<readonly GeneratedReport[]>([]);
  readonly isLoadingReports = signal<boolean>(false);
  readonly isRequesting = signal<boolean>(false);
  readonly generatingReportId = signal<string | null>(null);
  readonly isDownloadingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Form & filter signals
  readonly selectedReportType = signal<ReportType>('STATISTICS');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly groupBy = signal<ReportGroupBy>('COMMANDAS');
  readonly cashFilter = signal<ReportCashFilter>('ALL');
  readonly periodGrouping = signal<ReportPeriodGrouping>('NONE');
  readonly includeProducts = signal<boolean>(true);
  readonly includeTables = signal<boolean>(true);
  readonly includeWaiters = signal<boolean>(true);
  readonly includeCategories = signal<boolean>(true);

  // Computed signals
  readonly includedPeriods = computed<readonly ReportIncludedPeriod[]>(() =>
    calculateIncludedPeriods(this.fromDate(), this.toDate(), this.periodGrouping()),
  );

  readonly activeGeneratingReport = computed(() => {
    const id = this.generatingReportId();
    if (!id) return null;
    return this.reports().find((r) => r.id === id) ?? null;
  });

  readonly hasActiveJob = computed(() => !!this.generatingReportId());

  constructor() {
    this.setDateRangePreset('thisMonth');

    this.destroyRef.onDestroy(() => {
      this.cancelActivePolling$.next();
      this.cancelActivePolling$.complete();
    });
  }

  loadReports(): void {
    this.isLoadingReports.set(true);
    this.errorMessage.set(null);

    this.repository
      .listReports()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.errorMessage.set(error?.message ?? 'No se pudo cargar la lista de reportes.');
          return EMPTY;
        }),
        finalize(() => this.isLoadingReports.set(false)),
      )
      .subscribe((data) => {
        this.reports.set(data);
        if (!this.generatingReportId()) {
          const active = data.find((r) => r.status === 'PENDING' || r.status === 'PROCESSING');
          if (active) {
            this.generatingReportId.set(active.id);
            this.startPolling(active.id);
          }
        }
      });
  }

  setReportType(type: ReportType): void {
    this.selectedReportType.set(type);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  setDateRangePreset(preset: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth'): void {
    const now = new Date();
    const todayStr = this.organizationTime.localDate(now);

    if (preset === 'today') {
      this.fromDate.set(todayStr);
      this.toDate.set(todayStr);
      return;
    }

    if (preset === 'thisWeek') {
      const dayOfWeek = now.getDay() || 7; // Monday = 1, Sunday = 7
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      this.fromDate.set(this.organizationTime.localDate(monday));
      this.toDate.set(todayStr);
      return;
    }

    if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.fromDate.set(this.organizationTime.localDate(firstDay));
      this.toDate.set(todayStr);
      return;
    }

    if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.fromDate.set(this.organizationTime.localDate(firstDayLastMonth));
      this.toDate.set(this.organizationTime.localDate(lastDayLastMonth));
      return;
    }
  }

  requestReport(): void {
    if (this.isRequesting() || this.hasActiveJob()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const from = this.fromDate();
    const to = this.toDate();

    if (from && to && from > to) {
      this.errorMessage.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    this.isRequesting.set(true);

    const requestPayload: CreateReportRequest = {
      reportType: this.selectedReportType(),
      fromDate: from ? `${from}T00:00:00Z` : null,
      toDate: to ? `${to}T23:59:59Z` : null,
      groupBy:
        this.selectedReportType() === 'SALES' || this.selectedReportType() === 'SALES_AND_EXPENSES'
          ? this.groupBy()
          : null,
      cashFilter: this.selectedReportType() === 'EXPENSES' ? this.cashFilter() : null,
      periodGrouping: this.periodGrouping(),
      includeProducts:
        this.selectedReportType() === 'STATISTICS' ? this.includeProducts() : undefined,
      includeTables: this.selectedReportType() === 'STATISTICS' ? this.includeTables() : undefined,
      includeWaiters:
        this.selectedReportType() === 'STATISTICS' ? this.includeWaiters() : undefined,
      includeCategories:
        this.selectedReportType() === 'STATISTICS' ? this.includeCategories() : undefined,
    };

    this.repository
      .requestReport(requestPayload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.errorMessage.set(
            error?.message ?? 'Ocurrió un error al solicitar la generación del reporte.',
          );
          return EMPTY;
        }),
        finalize(() => this.isRequesting.set(false)),
      )
      .subscribe((createdReport) => {
        // Prepend to reports list if not already there
        const existing = this.reports();
        if (!existing.some((r) => r.id === createdReport.id)) {
          this.reports.set([createdReport, ...existing]);
        }

        if (createdReport.status === 'COMPLETED') {
          this.successMessage.set('¡Informe generado exitosamente!');
          this.downloadReport(createdReport);
          return;
        }

        if (createdReport.status === 'FAILED') {
          this.errorMessage.set(
            createdReport.errorMessage ?? 'Ocurrió un error al generar el reporte.',
          );
          return;
        }

        // Async job is PENDING or PROCESSING - start polling
        this.generatingReportId.set(createdReport.id);
        this.startPolling(createdReport.id);
      });
  }

  downloadReport(report: GeneratedReport): void {
    if (this.isDownloadingId() || report.status !== 'COMPLETED') {
      return;
    }

    this.isDownloadingId.set(report.id);
    this.errorMessage.set(null);

    this.repository
      .downloadReport(report.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.errorMessage.set(
            error?.message ?? 'Ocurrió un error al descargar el archivo del informe.',
          );
          return EMPTY;
        }),
        finalize(() => this.isDownloadingId.set(null)),
      )
      .subscribe((blob) => {
        this.triggerFileDownload(blob, report.fileName ?? `reporte_${report.id.slice(0, 8)}.xlsx`);
      });
  }

  private startPolling(reportId: string): void {
    this.cancelActivePolling$.next();

    interval(2000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        exhaustMap(() => this.repository.getReportStatus(reportId).pipe(catchError(() => EMPTY))),
        takeWhile((report) => report.status === 'PENDING' || report.status === 'PROCESSING', true),
        catchError((error) => {
          this.generatingReportId.set(null);
          this.errorMessage.set(
            error?.message ?? 'Error consultando el progreso de la generación del reporte.',
          );
          return EMPTY;
        }),
      )
      .subscribe((statusReport) => {
        // Update in reports list
        this.reports.update((list) =>
          list.map((item) => (item.id === statusReport.id ? statusReport : item)),
        );

        if (statusReport.status === 'COMPLETED') {
          this.generatingReportId.set(null);
          this.successMessage.set('¡Informe generado exitosamente!');
          this.downloadReport(statusReport);
        } else if (statusReport.status === 'FAILED') {
          this.generatingReportId.set(null);
          this.errorMessage.set(
            statusReport.errorMessage ?? 'Ocurrió un error al procesar el reporte en el servidor.',
          );
        }
      });
  }

  private triggerFileDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
