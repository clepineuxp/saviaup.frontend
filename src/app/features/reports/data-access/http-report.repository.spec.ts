import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../shared/api/api-client.service';
import { HttpReportRepository } from './http-report.repository';
import { CreateReportRequest } from '../models/report.model';

describe('HttpReportRepository', () => {
  let repository: HttpReportRepository;
  let apiMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    getBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    apiMock = {
      get: vi.fn(),
      post: vi.fn(),
      getBlob: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [HttpReportRepository, { provide: ApiClient, useValue: apiMock }],
    });

    repository = TestBed.inject(HttpReportRepository);
  });

  it('sends POST request to /api/reports when requesting a report', () => {
    const request: CreateReportRequest = {
      reportType: 'SALES',
      groupBy: 'COMMANDAS',
      fromDate: '2026-11-01',
      toDate: '2026-11-08',
    };

    apiMock.post.mockReturnValue(
      of({
        id: 'report-123',
        reportType: 'SALES',
        status: 'PENDING',
        createdAtUtc: '2026-11-08T10:00:00Z',
      }),
    );

    let resultReportId: string | undefined;
    repository.requestReport(request).subscribe((report) => {
      resultReportId = report.id;
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      '/api/reports',
      expect.objectContaining({
        reportType: 'SALES',
        groupBy: 'COMMANDAS',
        periodGrouping: 'NONE',
      }),
    );
    expect(resultReportId).toBe('report-123');
  });

  it('sends GET request to /api/reports when listing reports', () => {
    apiMock.get.mockReturnValue(
      of([
        {
          id: 'report-1',
          reportType: 'STATISTICS',
          status: 'COMPLETED',
          createdAtUtc: '2026-11-08T10:00:00Z',
        },
      ]),
    );

    let count = 0;
    repository.listReports().subscribe((reports) => {
      count = reports.length;
    });

    expect(apiMock.get).toHaveBeenCalledWith('/api/reports');
    expect(count).toBe(1);
  });

  it('sends GET request to /api/reports/{id} when querying report status', () => {
    apiMock.get.mockReturnValue(
      of({
        id: 'report-456',
        reportType: 'EXPENSES',
        status: 'PROCESSING',
        createdAtUtc: '2026-11-08T11:00:00Z',
      }),
    );

    let status = '';
    repository.getReportStatus('report-456').subscribe((report) => {
      status = report.status;
    });

    expect(apiMock.get).toHaveBeenCalledWith('/api/reports/report-456');
    expect(status).toBe('PROCESSING');
  });

  it('sends getBlob request to /api/reports/{id}/download when downloading a report', () => {
    const dummyBlob = new Blob(['test']);
    apiMock.getBlob.mockReturnValue(of(dummyBlob));

    let receivedBlob: Blob | undefined;
    repository.downloadReport('report-789').subscribe((blob) => {
      receivedBlob = blob;
    });

    expect(apiMock.getBlob).toHaveBeenCalledWith('/api/reports/report-789/download');
    expect(receivedBlob).toBe(dummyBlob);
  });
});
