import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import {
  CreateDiningAreaRequest,
  DiningArea,
  DiningAreaTables,
  RestaurantTable,
  SaveRestaurantTableRequest,
  SetTableOperationRequest,
  TableMetrics,
  TableOperationSnapshot,
  TableOrderUpdatedEvent,
  TableStatusChangedEvent,
  TableViewMode,
  UpdateDiningAreaRequest,
  UpdateTableOrderRequest,
} from '../models/table.model';
import { TablePermission } from '../table-permissions';
import { TableRealtimeClient } from './table-realtime.client';
import { TABLE_REPOSITORY } from './table.repository';

export interface TableFeatureError {
  readonly status: number;
  readonly code: string | null;
  readonly message: string;
}

const EMPTY_METRICS: TableMetrics = { available: 0, occupied: 0, activeSalesTotal: 0 };

@Injectable()
export class TableStore {
  private readonly repository = inject(TABLE_REPOSITORY);
  private readonly realtime = inject(TableRealtimeClient);
  private readonly auth = inject(AuthStore);
  private readonly tenant = inject(TenantContext);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly operationAreasState = signal<readonly DiningAreaTables[]>([]);
  private readonly cashRegisterState = signal<TableOperationSnapshot['cashRegister']>({
    requiresOpenShift: false,
    hasOpenShift: true,
    isInteractionBlocked: false,
  });
  private readonly areasState = signal<readonly DiningArea[]>([]);
  private readonly tablesState = signal<readonly RestaurantTable[]>([]);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<TableFeatureError | null>(null);
  private readonly selectedAreaIdState = signal<string | null>(null);
  private readonly viewModeState = signal<TableViewMode>('room');
  private readonly backendMetricsState = signal<Partial<TableMetrics>>({});
  private scopedTenantId: string | null = null;
  private scopeVersion = 0;
  private permissionsRequest?: Observable<readonly string[]>;

  readonly operationAreas = this.operationAreasState.asReadonly();
  readonly cashRegister = this.cashRegisterState.asReadonly();
  readonly areas = this.areasState.asReadonly();
  readonly tables = this.tablesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly mutationStatus = this.mutationStatusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly selectedAreaId = this.selectedAreaIdState.asReadonly();
  readonly viewMode = this.viewModeState.asReadonly();
  readonly realtimeState = this.realtime.state;
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');
  readonly canOperate = computed(() => this.permissionsState().has('tables.operate'));
  readonly canManage = computed(() => this.permissionsState().has('tables.manage'));
  readonly selectedArea = computed(() => {
    const areas = this.operationAreasState();
    return areas.find((item) => item.area.id === this.selectedAreaIdState()) ?? areas[0] ?? null;
  });
  readonly metrics = computed<TableMetrics>(() => {
    const tables = this.operationAreasState().flatMap((area) => area.tables);
    const backend = this.backendMetricsState();
    if (tables.length === 0) return { ...EMPTY_METRICS, ...backend };
    return {
      available: tables.filter((table) => table.status === 'AVAILABLE').length,
      occupied: tables.filter((table) => table.status === 'OCCUPIED').length,
      activeSalesTotal: tables
        .filter((table) => table.status === 'OCCUPIED')
        .reduce((total, table) => total + table.activeOrderTotal, 0),
      todaySalesTotal: backend.todaySalesTotal ?? 0,
      todayExpensesTotal: backend.todayExpensesTotal ?? 0,
      openShiftSalesTotal: backend.openShiftSalesTotal ?? 0,
      openShiftExpensesTotal: backend.openShiftExpensesTotal ?? 0,
    };
  });

  constructor() {
    effect(() => {
      const tenantId = this.tenant.activeTenant()?.id ?? null;
      untracked(() => {
        if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
      });
    });
    this.realtime.statusChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.applyStatusEvent(event));
    this.realtime.orderUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.applyOrderEvent(event));
    this.destroyRef.onDestroy(() => void this.realtime.disconnect());
  }

  hasPermission(permission: TablePermission): boolean {
    return this.permissionsState().has(permission);
  }

  ensurePermissions(): Observable<readonly string[]> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    if (this.permissionsRequest) return this.permissionsRequest;
    if (this.permissionsState().size > 0) return of([...this.permissionsState()]);
    const version = this.scopeVersion;
    const request = this.auth.loadCurrentUser().pipe(
      map((user) => user.permissions),
      tap((permissions) => {
        if (this.isCurrent(tenantId, version)) this.permissionsState.set(new Set(permissions));
      }),
      finalize(() => (this.permissionsRequest = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.permissionsRequest = request;
    return request;
  }

  initializeOperation(): Observable<TableOperationSnapshot> {
    return this.ensurePermissions().pipe(switchMap(() => this.loadOperation()));
  }

  loadOperation(): Observable<TableOperationSnapshot> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const version = this.scopeVersion;
    this.statusState.set('loading');
    this.errorState.set(null);
    return this.repository.operationSnapshot().pipe(
      tap((snapshot) => {
        if (!this.isCurrent(tenantId, version)) return;
        this.operationAreasState.set(snapshot.areas);
        this.cashRegisterState.set(snapshot.cashRegister);
        this.backendMetricsState.set({
          todaySalesTotal: snapshot.metrics.todaySalesTotal ?? 0,
          todayExpensesTotal: snapshot.metrics.todayExpensesTotal ?? 0,
          openShiftSalesTotal: snapshot.metrics.openShiftSalesTotal ?? 0,
          openShiftExpensesTotal: snapshot.metrics.openShiftExpensesTotal ?? 0,
        });
        this.ensureSelectedArea(snapshot.areas);
        this.statusState.set('success');
        void this.realtime.connect().catch(() => undefined);
      }),
      catchError((error: unknown) => this.fail(error, 'tables.read')),
      finalize(() => this.finishLoading(tenantId, version)),
    );
  }

  loadConfiguration(): Observable<readonly [readonly DiningArea[], readonly RestaurantTable[]]> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const version = this.scopeVersion;
    this.statusState.set('loading');
    this.errorState.set(null);
    return forkJoin([this.repository.listAreas(), this.repository.listTables()] as const).pipe(
      tap(([areas, tables]) => {
        if (!this.isCurrent(tenantId, version)) return;
        this.areasState.set(areas);
        this.tablesState.set(tables);
        this.statusState.set('success');
      }),
      catchError((error: unknown) => this.fail(error, 'tables.manage')),
      finalize(() => this.finishLoading(tenantId, version)),
    );
  }

  selectArea(areaId: string): void {
    this.selectedAreaIdState.set(areaId);
  }

  setViewMode(mode: TableViewMode): void {
    this.viewModeState.set(mode);
  }

  setOperation(tableId: string, request: SetTableOperationRequest): Observable<RestaurantTable> {
    return this.mutate(this.repository.setOperation(tableId, request), (table) =>
      this.upsertOperationTable(table),
    );
  }

  updateOrder(tableId: string, request: UpdateTableOrderRequest): Observable<RestaurantTable> {
    return this.mutate(this.repository.updateOrder(tableId, request), (table) =>
      this.upsertOperationTable(table),
    );
  }

  createArea(request: CreateDiningAreaRequest): Observable<DiningArea> {
    return this.configMutation(this.repository.createArea(request));
  }

  updateArea(areaId: string, request: UpdateDiningAreaRequest): Observable<DiningArea> {
    return this.configMutation(this.repository.updateArea(areaId, request));
  }

  reorderAreas(areaIds: readonly string[]): Observable<readonly DiningArea[]> {
    return this.configMutation(this.repository.reorderAreas(areaIds));
  }

  deleteArea(areaId: string): Observable<void> {
    return this.configMutation(this.repository.deleteArea(areaId));
  }

  createTable(request: SaveRestaurantTableRequest): Observable<RestaurantTable> {
    return this.configMutation(this.repository.createTable(request));
  }

  updateTable(tableId: string, request: SaveRestaurantTableRequest): Observable<RestaurantTable> {
    return this.configMutation(this.repository.updateTable(tableId, request));
  }

  deleteTable(tableId: string): Observable<void> {
    return this.configMutation(this.repository.deleteTable(tableId));
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private configMutation<T>(request: Observable<T>): Observable<T> {
    return this.mutate(request, () => undefined).pipe(
      switchMap((result) =>
        this.loadConfiguration().pipe(
          map(() => result),
          catchError(() => of(result)),
        ),
      ),
    );
  }

  private mutate<T>(request: Observable<T>, accept: (result: T) => void): Observable<T> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const version = this.scopeVersion;
    this.mutationStatusState.set('loading');
    this.errorState.set(null);
    return request.pipe(
      tap((result) => {
        if (!this.isCurrent(tenantId, version)) return;
        accept(result);
        this.mutationStatusState.set('success');
      }),
      catchError((error: unknown) => {
        const mapped = this.mapError(error);
        if (this.isCurrent(tenantId, version)) {
          this.errorState.set(mapped);
          this.mutationStatusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.isCurrent(tenantId, version) && this.mutationStatusState() === 'loading')
          this.mutationStatusState.set('idle');
      }),
    );
  }

  private applyStatusEvent(event: TableStatusChangedEvent): void {
    if (event.isDeleted) {
      this.operationAreasState.update((areas) =>
        areas.map((area) => ({
          ...area,
          tables: area.tables.filter((table) => table.id !== event.table.id),
        })),
      );
      return;
    }
    this.upsertOperationTable(event.table);
  }

  private applyOrderEvent(event: TableOrderUpdatedEvent): void {
    this.operationAreasState.update((areas) =>
      areas.map((area) => ({
        ...area,
        tables: area.tables.map((table) =>
          table.id === event.tableId
            ? { ...table, activeOrderTotal: event.total, updatedAt: event.updatedAt }
            : table,
        ),
      })),
    );
  }

  private upsertOperationTable(updated: RestaurantTable): void {
    this.operationAreasState.update((areas) =>
      areas.map((area) => {
        const without = area.tables.filter((table) => table.id !== updated.id);
        return area.area.id === updated.diningAreaId
          ? { ...area, tables: [...without, updated] }
          : { ...area, tables: without };
      }),
    );
  }

  private ensureSelectedArea(areas: readonly DiningAreaTables[]): void {
    if (!areas.some((item) => item.area.id === this.selectedAreaIdState()))
      this.selectedAreaIdState.set(areas[0]?.area.id ?? null);
  }

  private fail(error: unknown, permission: TablePermission): Observable<never> {
    const mapped = this.mapError(error);
    this.errorState.set(mapped);
    this.statusState.set('error');
    if (mapped.status === 403 && mapped.code === 'TENANT_REQUIRED') {
      this.tenant.clear();
      void this.router.navigate(['/select-tenant']);
    } else if (mapped.status === 403 && mapped.code === 'AUTH_FORBIDDEN') {
      this.permissionsState.update((permissions) => {
        const next = new Set(permissions);
        next.delete(permission);
        return next;
      });
    }
    return throwError(() => error);
  }

  private mapError(error: unknown): TableFeatureError {
    if (error instanceof ApiError)
      return { status: error.status, code: error.code, message: error.message };
    return { status: 0, code: null, message: 'No pudimos completar la solicitud.' };
  }

  private finishLoading(tenantId: string, version: number): void {
    if (this.isCurrent(tenantId, version) && this.statusState() === 'loading')
      this.statusState.set('idle');
  }

  private requireTenant(): string | null {
    const tenantId = this.tenant.activeTenant()?.id ?? null;
    if (!tenantId) void this.router.navigate(['/select-tenant']);
    else if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
    return tenantId;
  }

  private isCurrent(tenantId: string, version: number): boolean {
    return this.scopedTenantId === tenantId && this.scopeVersion === version;
  }

  private changeScope(tenantId: string | null): void {
    this.scopedTenantId = tenantId;
    this.scopeVersion += 1;
    this.permissionsRequest = undefined;
    this.permissionsState.set(new Set());
    this.operationAreasState.set([]);
    this.areasState.set([]);
    this.tablesState.set([]);
    this.selectedAreaIdState.set(null);
    this.statusState.set('idle');
    this.mutationStatusState.set('idle');
    this.errorState.set(null);
    void this.realtime.disconnect();
  }
}
