import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { CreateReportRequest, GeneratedReport } from '../models/report.model';
import {
  CreateReportRequestDto,
  GeneratedReportDto,
  mapReportDtoToModel,
} from './report.contracts';
import { ReportRepository } from './report.repository';

@Injectable({
  providedIn: 'root',
})
export class HttpReportRepository implements ReportRepository {
  private readonly api = inject(ApiClient);

  requestReport(request: CreateReportRequest): Observable<GeneratedReport> {
    const payload: CreateReportRequestDto = {
      reportType: request.reportType,
      fromDate: request.fromDate ? new Date(request.fromDate).toISOString() : undefined,
      toDate: request.toDate ? new Date(request.toDate).toISOString() : undefined,
      fromLocalDate: request.fromLocalDate ?? null,
      toLocalDate: request.toLocalDate ?? null,
      includeTips: request.includeTips ?? false,
      groupBy: request.groupBy ?? null,
      cashFilter: request.cashFilter ?? null,
      periodGrouping: request.periodGrouping ?? 'NONE',
      includeProducts: request.includeProducts ?? true,
      includeTables: request.includeTables ?? true,
      includeWaiters: request.includeWaiters ?? true,
      includeCategories: request.includeCategories ?? true,
    };

    return this.api
      .post<GeneratedReportDto, CreateReportRequestDto>(API_ENDPOINTS.reports.root, payload)
      .pipe(map(mapReportDtoToModel));
  }

  listReports(): Observable<GeneratedReport[]> {
    return this.api
      .get<GeneratedReportDto[]>(API_ENDPOINTS.reports.root)
      .pipe(map((items) => items.map(mapReportDtoToModel)));
  }

  getReportStatus(reportId: string): Observable<GeneratedReport> {
    return this.api
      .get<GeneratedReportDto>(API_ENDPOINTS.reports.detail(reportId))
      .pipe(map(mapReportDtoToModel));
  }

  downloadReport(reportId: string): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINTS.reports.download(reportId));
  }
}
