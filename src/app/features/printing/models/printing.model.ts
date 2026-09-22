export type PrintingTab = 'agents' | 'zones' | 'queue';
export type PrintJobStatus =
  'PENDING' | 'QUEUED' | 'SENT' | 'PROCESSING' | 'PRINTING' | 'PRINTED' | 'FAILED' | 'CANCELLED';
export type PrinterConnectionType = 'WINDOWS_SPOOLER' | 'NETWORK' | 'ESC_POS_NETWORK';

export interface PrintingConfiguration {
  readonly agentDownloadUrl: string | null;
  readonly heartbeatIntervalSeconds: number;
}

export interface PrintingLocation {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface PrintAgent {
  readonly id: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly name: string;
  readonly deviceIdentifier: string;
  readonly hostname: string;
  readonly operatingSystem: string;
  readonly version: string;
  readonly status: string;
  readonly lastSeenAt: string | null;
  readonly printerCount: number;
  readonly localIpAddress: string | null;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DiscoveredPrintAgent {
  readonly discoveryId: string;
  readonly deviceIdentifier: string;
  readonly hostname: string;
  readonly operatingSystem: string;
  readonly version: string;
  readonly localIpAddress: string | null;
  readonly connectedAt: string;
  readonly isReactivation: boolean;
}

export interface Printer {
  readonly id: string;
  readonly locationId: string;
  readonly printAgentId: string;
  readonly name: string;
  readonly connectionType: PrinterConnectionType;
  readonly localPrinterName: string | null;
  readonly ipAddress: string | null;
  readonly port: number | null;
  readonly paperWidth: number;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AvailablePrinter {
  readonly id: string;
  readonly printAgentId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly isAvailable: boolean;
  readonly isConfigured: boolean;
  readonly lastSeenAt: string;
}

export interface PrintingZone {
  readonly id: string;
  readonly locationId: string;
  readonly printAgentId: string;
  readonly agentName: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly printerIds: readonly string[];
  readonly categoryIds: readonly string[];
  readonly productIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PrintingRouteOption {
  readonly id: string;
  readonly name: string;
}

export interface PrintingRoutingOptions {
  readonly categories: readonly PrintingRouteOption[];
  readonly products: readonly PrintingRouteOption[];
}

export interface PrintJob {
  readonly id: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly printAgentId: string;
  readonly agentName: string;
  readonly printerId: string;
  readonly printerName: string;
  readonly printerConnectionType: PrinterConnectionType;
  readonly localPrinterName: string | null;
  readonly printerIpAddress: string | null;
  readonly printerPort: number | null;
  readonly paperWidth: number;
  readonly printingZoneId: string | null;
  readonly zoneName: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly documentType: string;
  readonly payloadJson: string;
  readonly status: PrintJobStatus;
  readonly attempts: number;
  readonly createdAt: string;
  readonly queuedAt: string;
  readonly sentAt: string | null;
  readonly printingAt: string | null;
  readonly printedAt: string | null;
  readonly failedAt: string | null;
  readonly lastError: string | null;
  readonly originalPrintJobId: string | null;
  readonly isReprint: boolean;
}

export interface PrintJobPage {
  readonly items: readonly PrintJob[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface PrintJobQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | null;
  readonly status: string | null;
  readonly zoneId: string | null;
  readonly agentId: string | null;
  readonly printerId: string | null;
  readonly fromDate: string | null;
  readonly toDate: string | null;
}

export interface SavePrinterRequest {
  readonly printAgentId: string;
  readonly name: string;
  readonly connectionType: PrinterConnectionType;
  readonly localPrinterName: string | null;
  readonly ipAddress: string | null;
  readonly port: number | null;
  readonly paperWidth: number;
  readonly enabled: boolean;
}

export interface SavePrintingZoneRequest {
  readonly locationId: string | null;
  readonly printAgentId: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly printerIds: readonly string[];
  readonly categoryIds: readonly string[];
  readonly productIds: readonly string[];
}

export const EMPTY_PRINT_JOB_PAGE: PrintJobPage = {
  items: [],
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 0,
};

export const DEFAULT_PRINT_JOB_QUERY: PrintJobQuery = {
  page: 1,
  pageSize: 25,
  search: null,
  status: null,
  zoneId: null,
  agentId: null,
  printerId: null,
  fromDate: null,
  toDate: null,
};
