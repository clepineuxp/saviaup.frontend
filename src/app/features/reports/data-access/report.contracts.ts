import { GeneratedReport, ReportStatus, ReportType } from '../models/report.model';

export interface GeneratedReportDto {
  id: string;
  reportType: string;
  status: string;
  fromDate?: string | null;
  toDate?: string | null;
  parametersJson?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  errorMessage?: string | null;
  createdAtUtc: string;
  completedAtUtc?: string | null;
}

export interface CreateReportRequestDto {
  reportType: string;
  fromDate?: string | null;
  toDate?: string | null;
  groupBy?: string | null;
  cashFilter?: string | null;
  periodGrouping?: string | null;
  includeProducts?: boolean;
  includeTables?: boolean;
  includeWaiters?: boolean;
  includeCategories?: boolean;
}

export function mapReportDtoToModel(dto: GeneratedReportDto): GeneratedReport {
  return {
    id: dto.id,
    reportType: dto.reportType as ReportType,
    status: dto.status as ReportStatus,
    fromDate: dto.fromDate ?? null,
    toDate: dto.toDate ?? null,
    parametersJson: dto.parametersJson ?? null,
    fileName: dto.fileName ?? null,
    fileSizeBytes: dto.fileSizeBytes ?? null,
    errorMessage: dto.errorMessage ?? null,
    createdAtUtc: dto.createdAtUtc,
    completedAtUtc: dto.completedAtUtc ?? null,
  };
}
