import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { GeneratedReport } from '../models/report.model';
import { REPORT_REPOSITORY } from './report.repository';
import { ReportStoreService } from './report-store.service';

describe('ReportStoreService', () => {
  let store: ReportStoreService;
  let repositoryMock: {
    requestReport: ReturnType<typeof vi.fn>;
    listReports: ReturnType<typeof vi.fn>;
    getReportStatus: ReturnType<typeof vi.fn>;
    downloadReport: ReturnType<typeof vi.fn>;
  };

  const sampleReport: GeneratedReport = {
    id: 'rep-1',
    reportType: 'STATISTICS',
    status: 'COMPLETED',
    fromDate: '2026-11-01T00:00:00Z',
    toDate: '2026-11-08T23:59:59Z',
    parametersJson: '{}',
    fileName: 'reporte_estadisticas_20261108.xlsx',
    fileSizeBytes: 15400,
    errorMessage: null,
    createdAtUtc: '2026-11-08T12:00:00Z',
    completedAtUtc: '2026-11-08T12:01:00Z',
  };

  beforeEach(() => {
    repositoryMock = {
      requestReport: vi.fn(),
      listReports: vi.fn(() => of([sampleReport])),
      getReportStatus: vi.fn(),
      downloadReport: vi.fn(() => of(new Blob(['excel']))),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportStoreService,
        { provide: REPORT_REPOSITORY, useValue: repositoryMock },
        { provide: OrganizationTime, useValue: { localDate: () => '2026-11-08' } },
      ],
    });

    store = TestBed.inject(ReportStoreService);
  });

  it('initializes with default date presets and empty active job', () => {
    expect(store.selectedReportType()).toBe('STATISTICS');
    expect(store.hasActiveJob()).toBe(false);
    expect(store.toDate()).toBe('2026-11-08');
  });

  it('loads reports from repository into signal', () => {
    store.loadReports();
    expect(repositoryMock.listReports).toHaveBeenCalled();
    expect(store.reports().length).toBe(1);
    expect(store.reports()[0].id).toBe('rep-1');
  });

  it('updates selected report type', () => {
    store.setReportType('EXPENSES');
    expect(store.selectedReportType()).toBe('EXPENSES');
  });

  it('updates date range presets correctly', () => {
    store.setDateRangePreset('today');
    expect(store.fromDate()).toBe('2026-11-08');
    expect(store.toDate()).toBe('2026-11-08');
  });

  it('validates that fromDate <= toDate before requesting', () => {
    store.fromDate.set('2026-11-10');
    store.toDate.set('2026-11-01');

    store.requestReport();

    expect(store.errorMessage()).toContain('La fecha inicial no puede ser posterior');
    expect(repositoryMock.requestReport).not.toHaveBeenCalled();
  });

  it('requests report and handles immediate completed status', () => {
    repositoryMock.requestReport.mockReturnValue(of(sampleReport));
    const downloadSpy = vi.spyOn(store, 'downloadReport').mockImplementation(() => undefined);

    store.requestReport();

    expect(repositoryMock.requestReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'STATISTICS',
        periodGrouping: 'NONE',
      }),
    );
    expect(store.successMessage()).toBe('¡Informe generado exitosamente!');
    expect(downloadSpy).toHaveBeenCalledWith(sampleReport);
  });

  it('computes included periods when periodGrouping is changed', () => {
    store.fromDate.set('2026-11-01');
    store.toDate.set('2026-11-15');

    expect(store.includedPeriods()).toEqual([]);

    store.periodGrouping.set('WEEKLY');
    const weeklyPeriods = store.includedPeriods();
    expect(weeklyPeriods.length).toBeGreaterThan(0);
    expect(weeklyPeriods[0].label).toContain('Semana');

    store.periodGrouping.set('MONTHLY');
    const monthlyPeriods = store.includedPeriods();
    expect(monthlyPeriods.length).toBe(1);
    expect(monthlyPeriods[0].label).toContain('Noviembre 2026');
  });
});
