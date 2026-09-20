import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
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
import { PrintingRepository } from './printing.repository';

const compactParams = (values: object): Readonly<Record<string, string | number | boolean>> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== '')
      .map(([key, value]) => [key, value as string | number | boolean]),
  );

@Injectable()
export class HttpPrintingRepository implements PrintingRepository {
  private readonly api = inject(ApiClient);

  configuration(): Observable<PrintingConfiguration> {
    return this.api.get(API_ENDPOINTS.printing.configuration);
  }

  locations(): Observable<readonly PrintingLocation[]> {
    return this.api.get(API_ENDPOINTS.printing.locations);
  }

  routingOptions(): Observable<PrintingRoutingOptions> {
    return this.api.get(API_ENDPOINTS.printing.routingOptions);
  }

  agents(): Observable<readonly PrintAgent[]> {
    return this.api.get(API_ENDPOINTS.printing.agents);
  }

  discoveredAgents(): Observable<readonly DiscoveredPrintAgent[]> {
    return this.api.get(API_ENDPOINTS.printing.discoveredAgents);
  }

  linkDiscoveredAgent(
    discoveryId: string,
    locationId: string | null,
    agentName: string | null,
  ): Observable<PrintAgent> {
    return this.api.post(API_ENDPOINTS.printing.linkDiscoveredAgent, {
      discoveryId,
      locationId,
      agentName,
    });
  }

  updateAgent(agentId: string, name: string, enabled: boolean): Observable<PrintAgent> {
    return this.api.put(API_ENDPOINTS.printing.agent(agentId), { name, enabled });
  }

  deleteAgent(agentId: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.printing.agent(agentId));
  }

  printers(): Observable<readonly Printer[]> {
    return this.api.get(API_ENDPOINTS.printing.printers);
  }

  availablePrinters(agentId: string): Observable<readonly AvailablePrinter[]> {
    return this.api.get(API_ENDPOINTS.printing.availablePrinters(agentId));
  }

  requestPrinterDiscovery(agentId: string): Observable<void> {
    return this.api.post(API_ENDPOINTS.printing.discoverPrinters(agentId), {});
  }

  createPrinter(request: SavePrinterRequest): Observable<Printer> {
    return this.api.post(API_ENDPOINTS.printing.agentPrinters(request.printAgentId), request);
  }

  updatePrinter(printerId: string, request: SavePrinterRequest): Observable<Printer> {
    return this.api.put(API_ENDPOINTS.printing.printer(printerId), request);
  }

  deletePrinter(printerId: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.printing.printer(printerId));
  }

  testPrint(agentId: string, printerId: string): Observable<PrintJob> {
    return this.api.post(API_ENDPOINTS.printing.testPrint(agentId), {}, { params: { printerId } });
  }

  zones(): Observable<readonly PrintingZone[]> {
    return this.api.get(API_ENDPOINTS.printing.zones);
  }

  createZone(request: SavePrintingZoneRequest): Observable<PrintingZone> {
    return this.api.post(API_ENDPOINTS.printing.zones, request);
  }

  updateZone(zoneId: string, request: SavePrintingZoneRequest): Observable<PrintingZone> {
    return this.api.put(API_ENDPOINTS.printing.zone(zoneId), request);
  }

  deleteZone(zoneId: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.printing.zone(zoneId));
  }

  jobs(query: PrintJobQuery): Observable<PrintJobPage> {
    return this.api.get(API_ENDPOINTS.printing.jobs, { params: compactParams(query) });
  }

  retryJob(jobId: string): Observable<PrintJob> {
    return this.api.post(API_ENDPOINTS.printing.retryJob(jobId), {});
  }

  reprintJob(jobId: string): Observable<PrintJob> {
    return this.api.post(API_ENDPOINTS.printing.reprintJob(jobId), {});
  }
}
