import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateReportRequest, GeneratedReport } from '../models/report.model';

export interface ReportRepository {
  requestReport(request: CreateReportRequest): Observable<GeneratedReport>;
  listReports(): Observable<GeneratedReport[]>;
  getReportStatus(reportId: string): Observable<GeneratedReport>;
  downloadReport(reportId: string): Observable<Blob>;
}

export const REPORT_REPOSITORY = new InjectionToken<ReportRepository>('REPORT_REPOSITORY');
