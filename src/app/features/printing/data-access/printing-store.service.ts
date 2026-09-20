import { computed, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  timer,
  throwError,
} from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import {
  AvailablePrinter,
  DiscoveredPrintAgent,
  DEFAULT_PRINT_JOB_QUERY,
  EMPTY_PRINT_JOB_PAGE,
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
import { PRINTING_REPOSITORY } from './printing.repository';

export type PrintingPermission =
  | 'printing.agents.read'
  | 'printing.agents.manage'
  | 'printing.zones.read'
  | 'printing.zones.manage'
  | 'printing.queue.read'
  | 'printing.queue.retry'
  | 'printing.queue.reprint';

const EMPTY_ROUTING: PrintingRoutingOptions = { categories: [], products: [] };

@Injectable()
export class PrintingStore {
  private readonly repository = inject(PRINTING_REPOSITORY);
  private readonly auth = inject(AuthStore);
  private readonly permissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly configurationState = signal<PrintingConfiguration | null>(null);
  private readonly locationsState = signal<readonly PrintingLocation[]>([]);
  private readonly agentsState = signal<readonly PrintAgent[]>([]);
  private readonly discoveredAgentsState = signal<readonly DiscoveredPrintAgent[]>([]);
  private readonly printersState = signal<readonly Printer[]>([]);
  private readonly availablePrintersState = signal<readonly AvailablePrinter[]>([]);
  private readonly zonesState = signal<readonly PrintingZone[]>([]);
  private readonly routingState = signal<PrintingRoutingOptions>(EMPTY_ROUTING);
  private readonly jobsState = signal<PrintJobPage>(EMPTY_PRINT_JOB_PAGE);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<string | null>(null);
  private permissionRequest?: Observable<readonly string[]>;
  private jobQuery: PrintJobQuery = DEFAULT_PRINT_JOB_QUERY;

  readonly configuration = this.configurationState.asReadonly();
  readonly locations = this.locationsState.asReadonly();
  readonly agents = this.agentsState.asReadonly();
  readonly discoveredAgents = this.discoveredAgentsState.asReadonly();
  readonly printers = this.printersState.asReadonly();
  readonly availablePrinters = this.availablePrintersState.asReadonly();
  readonly zones = this.zonesState.asReadonly();
  readonly routing = this.routingState.asReadonly();
  readonly jobs = this.jobsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly mutationStatus = this.mutationStatusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');

  hasPermission(permission: PrintingPermission): boolean {
    return this.permissionsState().has(permission);
  }

  ensurePermissions(): Observable<readonly string[]> {
    if (this.permissionRequest) return this.permissionRequest;
    if (this.permissionsState().size > 0) return of([...this.permissionsState()]);
    this.permissionRequest = this.auth.loadCurrentUser().pipe(
      map((user) => user.permissions),
      tap((permissions) => this.permissionsState.set(new Set(permissions))),
      finalize(() => (this.permissionRequest = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.permissionRequest;
  }

  initialize(): Observable<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    const canAgents =
      this.hasPermission('printing.agents.read') || this.hasPermission('printing.agents.manage');
    const canZones =
      this.hasPermission('printing.zones.read') || this.hasPermission('printing.zones.manage');
    const canQueue = this.hasPermission('printing.queue.read');
    const canLoadTopology = canAgents || canZones || canQueue;
    return forkJoin({
      configuration: canAgents ? this.repository.configuration() : of(null),
      locations: canAgents || canZones ? this.repository.locations() : of([]),
      agents: canLoadTopology ? this.repository.agents() : of([]),
      discoveredAgents: this.hasPermission('printing.agents.manage')
        ? this.repository.discoveredAgents()
        : of([]),
      printers: canLoadTopology ? this.repository.printers() : of([]),
      zones: canZones ? this.repository.zones() : of([]),
      routing: canZones ? this.repository.routingOptions() : of(EMPTY_ROUTING),
      jobs: canQueue ? this.repository.jobs(this.jobQuery) : of(EMPTY_PRINT_JOB_PAGE),
    }).pipe(
      tap((result) => {
        this.configurationState.set(result.configuration);
        this.locationsState.set(result.locations);
        this.agentsState.set(result.agents);
        this.discoveredAgentsState.set(result.discoveredAgents);
        this.printersState.set(result.printers);
        this.zonesState.set(result.zones);
        this.routingState.set(result.routing);
        this.jobsState.set(result.jobs);
        this.statusState.set('success');
      }),
      map(() => undefined),
      catchError((error: unknown) => this.fail<void>(error, this.statusState)),
      finalize(() => {
        if (this.statusState() === 'loading') this.statusState.set('idle');
      }),
    );
  }

  loadJobs(query: PrintJobQuery = this.jobQuery): Observable<PrintJobPage> {
    this.jobQuery = query;
    this.statusState.set('loading');
    this.errorState.set(null);
    return this.repository.jobs(query).pipe(
      tap((page) => {
        this.jobsState.set(page);
        this.statusState.set('success');
      }),
      catchError((error: unknown) => this.fail<PrintJobPage>(error, this.statusState)),
      finalize(() => {
        if (this.statusState() === 'loading') this.statusState.set('idle');
      }),
    );
  }

  refreshDiscoveredAgents(): Observable<readonly DiscoveredPrintAgent[]> {
    return this.mutate(this.repository.discoveredAgents()).pipe(
      tap((agents) => this.discoveredAgentsState.set(agents)),
    );
  }

  linkDiscoveredAgent(
    discoveryId: string,
    locationId: string | null,
    agentName: string | null,
  ): Observable<PrintAgent> {
    return this.mutate(
      this.repository.linkDiscoveredAgent(discoveryId, locationId, agentName),
    ).pipe(
      tap((agent) => {
        this.replaceAgent(agent);
        this.discoveredAgentsState.update((items) =>
          items.filter((item) => item.discoveryId !== discoveryId),
        );
      }),
    );
  }

  updateAgent(agentId: string, name: string, enabled: boolean): Observable<PrintAgent> {
    return this.mutate(this.repository.updateAgent(agentId, name, enabled)).pipe(
      tap((agent) => this.replaceAgent(agent)),
    );
  }

  deleteAgent(agentId: string): Observable<void> {
    return this.mutate(this.repository.deleteAgent(agentId)).pipe(
      tap(() => this.agentsState.update((items) => items.filter((item) => item.id !== agentId))),
    );
  }

  savePrinter(printerId: string | null, request: SavePrinterRequest): Observable<Printer> {
    const operation = printerId
      ? this.repository.updatePrinter(printerId, request)
      : this.repository.createPrinter(request);
    return this.mutate(operation).pipe(tap((printer) => this.replacePrinter(printer)));
  }

  deletePrinter(printerId: string): Observable<void> {
    return this.mutate(this.repository.deletePrinter(printerId)).pipe(
      tap(() =>
        this.printersState.update((items) => items.filter((item) => item.id !== printerId)),
      ),
    );
  }

  loadAvailablePrinters(agentId: string): Observable<readonly AvailablePrinter[]> {
    if (!agentId) {
      this.availablePrintersState.set([]);
      return of([]);
    }
    return this.repository.availablePrinters(agentId).pipe(
      tap((printers) => this.availablePrintersState.set(printers)),
      catchError((error: unknown) =>
        this.fail<readonly AvailablePrinter[]>(error, this.statusState),
      ),
    );
  }

  requestPrinterDiscovery(agentId: string): Observable<readonly AvailablePrinter[]> {
    return this.mutate(this.repository.requestPrinterDiscovery(agentId)).pipe(
      switchMap(() => timer(1200)),
      switchMap(() => this.repository.availablePrinters(agentId)),
      tap((printers) => this.availablePrintersState.set(printers)),
    );
  }

  testPrint(agentId: string, printerId: string): Observable<PrintJob> {
    return this.mutate(this.repository.testPrint(agentId, printerId)).pipe(
      tap((job) => this.prependJob(job)),
    );
  }

  saveZone(zoneId: string | null, request: SavePrintingZoneRequest): Observable<PrintingZone> {
    const operation = zoneId
      ? this.repository.updateZone(zoneId, request)
      : this.repository.createZone(request);
    return this.mutate(operation).pipe(tap((zone) => this.replaceZone(zone)));
  }

  deleteZone(zoneId: string): Observable<void> {
    return this.mutate(this.repository.deleteZone(zoneId)).pipe(
      tap(() => this.zonesState.update((items) => items.filter((item) => item.id !== zoneId))),
    );
  }

  retryJob(jobId: string): Observable<PrintJob> {
    return this.mutate(this.repository.retryJob(jobId)).pipe(tap((job) => this.replaceJob(job)));
  }

  reprintJob(jobId: string): Observable<PrintJob> {
    return this.mutate(this.repository.reprintJob(jobId)).pipe(tap((job) => this.prependJob(job)));
  }

  private mutate<T>(operation: Observable<T>): Observable<T> {
    this.mutationStatusState.set('loading');
    this.errorState.set(null);
    return operation.pipe(
      tap(() => this.mutationStatusState.set('success')),
      catchError((error: unknown) => this.fail<T>(error, this.mutationStatusState)),
      finalize(() => {
        if (this.mutationStatusState() === 'loading') this.mutationStatusState.set('idle');
      }),
    );
  }

  private fail<T>(error: unknown, status: { set(value: RequestStatus): void }): Observable<T> {
    this.errorState.set(
      error instanceof ApiError ? error.message : 'No pudimos completar la operación de impresión.',
    );
    status.set('error');
    return throwError(() => error);
  }

  private replaceAgent(value: PrintAgent): void {
    this.agentsState.update((items) =>
      items.some((item) => item.id === value.id)
        ? items.map((item) => (item.id === value.id ? value : item))
        : [value, ...items],
    );
  }

  private replacePrinter(value: Printer): void {
    this.printersState.update((items) =>
      items.some((item) => item.id === value.id)
        ? items.map((item) => (item.id === value.id ? value : item))
        : [value, ...items],
    );
  }

  private replaceZone(value: PrintingZone): void {
    this.zonesState.update((items) =>
      items.some((item) => item.id === value.id)
        ? items.map((item) => (item.id === value.id ? value : item))
        : [value, ...items],
    );
  }

  private replaceJob(value: PrintJob): void {
    this.jobsState.update((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === value.id ? value : item)),
    }));
  }

  private prependJob(value: PrintJob): void {
    this.jobsState.update((page) => ({
      ...page,
      items: [value, ...page.items.filter((item) => item.id !== value.id)].slice(0, page.pageSize),
      totalCount: page.totalCount + (page.items.some((item) => item.id === value.id) ? 0 : 1),
    }));
  }
}
