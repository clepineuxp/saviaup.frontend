import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPageComponent } from './reports-page.component';
import { ReportStoreService } from '../data-access/report-store.service';
import { GeneratedReport } from '../models/report.model';

describe('ReportsPageComponent', () => {
  let loadReportsMock: ReturnType<typeof vi.fn>;
  let requestReportMock: ReturnType<typeof vi.fn>;
  let downloadReportMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    loadReportsMock = vi.fn();
    requestReportMock = vi.fn();
    downloadReportMock = vi.fn();

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: ReportStoreService,
          useValue: {
            loadReports: loadReportsMock,
            requestReport: requestReportMock,
            downloadReport: downloadReportMock,
            reports: () => [],
            isLoadingReports: () => false,
            isRequesting: () => false,
            hasActiveJob: () => false,
            generatingReportId: () => null,
            isDownloadingId: () => null,
            errorMessage: () => null,
            successMessage: () => null,
            selectedReportType: () => 'STATISTICS',
            fromDate: () => '2026-11-01',
            toDate: () => '2026-11-08',
            groupBy: () => 'COMMANDAS',
            cashFilter: () => 'ALL',
            includeProducts: () => true,
            includeTables: () => true,
            includeWaiters: () => true,
            includeCategories: () => true,
          },
        },
      ],
    })
      .overrideComponent(ReportsPageComponent, { set: { template: '', imports: [] } })
      .compileComponents();
  });

  it('calls loadReports on init', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    expect(loadReportsMock).toHaveBeenCalled();
  });

  it('formats file sizes accurately', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    const component = fixture.componentInstance;

    expect(component.formatFileSize(undefined)).toBe('—');
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(1048576 * 2.5)).toBe('2.50 MB');
  });

  it('parses parameter tags from JSON correctly', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    const component = fixture.componentInstance;

    const report: GeneratedReport = {
      id: 'r1',
      reportType: 'SALES',
      status: 'COMPLETED',
      createdAtUtc: '2026-11-08T10:00:00Z',
      parametersJson: JSON.stringify({
        groupBy: 'COMMANDAS',
        cashFilter: 'ONLY_CASH_OUT',
        periodGrouping: 'WEEKLY',
        includeProducts: true,
      }),
    };

    const tags = component.getParameterTags(report);
    expect(tags).toContain('Por comandas');
    expect(tags).toContain('Solo caja');
    expect(tags).toContain('Por semanas');
    expect(tags).toContain('Productos');
  });
});
