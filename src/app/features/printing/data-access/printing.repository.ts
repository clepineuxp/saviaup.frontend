import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailablePrinter,
  DiscoveredPrintAgent,
  PrintAgent,
  Printer,
  PrintingConfiguration,
  PrintingLocation,
  PrintingRoutingOptions,
  PrintingZone,
  PrintJob,
  PrintJobPage,
  PrintJobQuery,
  SavePrinterRequest,
  SavePrintingZoneRequest,
} from '../models/printing.model';

export interface PrintingRepository {
  configuration(): Observable<PrintingConfiguration>;
  locations(): Observable<readonly PrintingLocation[]>;
  routingOptions(): Observable<PrintingRoutingOptions>;
  agents(): Observable<readonly PrintAgent[]>;
  discoveredAgents(): Observable<readonly DiscoveredPrintAgent[]>;
  linkDiscoveredAgent(
    discoveryId: string,
    locationId: string | null,
    agentName: string | null,
  ): Observable<PrintAgent>;
  updateAgent(agentId: string, name: string, enabled: boolean): Observable<PrintAgent>;
  deleteAgent(agentId: string): Observable<void>;
  printers(): Observable<readonly Printer[]>;
  availablePrinters(agentId: string): Observable<readonly AvailablePrinter[]>;
  requestPrinterDiscovery(agentId: string): Observable<void>;
  createPrinter(request: SavePrinterRequest): Observable<Printer>;
  updatePrinter(printerId: string, request: SavePrinterRequest): Observable<Printer>;
  deletePrinter(printerId: string): Observable<void>;
  testPrint(agentId: string, printerId: string): Observable<PrintJob>;
  zones(): Observable<readonly PrintingZone[]>;
  createZone(request: SavePrintingZoneRequest): Observable<PrintingZone>;
  updateZone(zoneId: string, request: SavePrintingZoneRequest): Observable<PrintingZone>;
  deleteZone(zoneId: string): Observable<void>;
  jobs(query: PrintJobQuery): Observable<PrintJobPage>;
  cancelJob(jobId: string): Observable<PrintJob>;
  retryJob(jobId: string): Observable<PrintJob>;
  reprintJob(jobId: string): Observable<PrintJob>;
}

export const PRINTING_REPOSITORY = new InjectionToken<PrintingRepository>('PRINTING_REPOSITORY');
