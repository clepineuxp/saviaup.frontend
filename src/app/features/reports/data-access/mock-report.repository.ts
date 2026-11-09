import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CreateReportRequest, GeneratedReport } from '../models/report.model';
import { ReportRepository } from './report.repository';

@Injectable({
  providedIn: 'root',
})
export class MockReportRepository implements ReportRepository {
  private reports: GeneratedReport[] = [
    {
      id: 'mock-report-1',
      reportType: 'SALES',
      status: 'COMPLETED',
      fromDate: '2026-11-01T00:00:00Z',
      toDate: '2026-11-08T23:59:59Z',
      parametersJson: JSON.stringify({ groupBy: 'COMMANDAS' }),
      fileName: 'reporte_ventas_20261108.xlsx',
      fileSizeBytes: 24500,
      errorMessage: null,
      createdAtUtc: new Date(Date.now() - 3600000).toISOString(),
      completedAtUtc: new Date(Date.now() - 3590000).toISOString(),
    },
    {
      id: 'mock-report-2',
      reportType: 'EXPENSES',
      status: 'COMPLETED',
      fromDate: '2026-11-01T00:00:00Z',
      toDate: '2026-11-08T23:59:59Z',
      parametersJson: JSON.stringify({ cashFilter: 'ALL' }),
      fileName: 'reporte_gastos_20261108.xlsx',
      fileSizeBytes: 18200,
      errorMessage: null,
      createdAtUtc: new Date(Date.now() - 7200000).toISOString(),
      completedAtUtc: new Date(Date.now() - 7190000).toISOString(),
    },
  ];

  requestReport(request: CreateReportRequest): Observable<GeneratedReport> {
    const newReport: GeneratedReport = {
      id: `mock-report-${Date.now()}`,
      reportType: request.reportType,
      status: 'COMPLETED',
      fromDate: request.fromDate ?? null,
      toDate: request.toDate ?? null,
      parametersJson: JSON.stringify(request),
      fileName: `reporte_${request.reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      fileSizeBytes: 20480,
      errorMessage: null,
      createdAtUtc: new Date().toISOString(),
      completedAtUtc: new Date().toISOString(),
    };
    this.reports = [newReport, ...this.reports];
    return of(newReport).pipe(delay(300));
  }

  listReports(): Observable<GeneratedReport[]> {
    return of([...this.reports]).pipe(delay(200));
  }

  getReportStatus(reportId: string): Observable<GeneratedReport> {
    const found = this.reports.find((r) => r.id === reportId);
    if (!found) {
      throw new Error(`Report ${reportId} not found`);
    }
    return of(found).pipe(delay(100));
  }

  downloadReport(reportId: string): Observable<Blob> {
    void reportId;
    const dummyBlob = new Blob(['mock excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return of(dummyBlob).pipe(delay(300));
  }
}
