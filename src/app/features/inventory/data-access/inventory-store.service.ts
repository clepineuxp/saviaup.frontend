import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
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
import { InventoryPermission } from '../inventory-permissions';
import {
  CategoryReference,
  CreateIngredientRequest,
  CreateInventoryMovementRequest,
  CreateMeasurementUnitRequest,
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGE,
  Ingredient,
  IngredientQuery,
  InventoryItem,
  InventoryMovement,
  InventoryMovementQuery,
  InventoryQuery,
  MeasurementUnit,
  MeasurementUnitQuery,
  PagedResponse,
  SetIngredientStatusRequest,
  SetMeasurementUnitStatusRequest,
  UpdateIngredientRequest,
  UpdateMeasurementUnitRequest,
} from '../models/inventory.model';
import {
  INGREDIENT_REPOSITORY,
  MEASUREMENT_UNIT_REPOSITORY,
  MOVEMENT_REPOSITORY,
  STOCK_REPOSITORY,
} from './inventory.repositories';

export interface InventoryFeatureError {
  readonly status: number;
  readonly code: string | null;
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
}

const DEFAULT_STOCK_QUERY: InventoryQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: null,
  belowMinimum: null,
};
const DEFAULT_INGREDIENT_QUERY: IngredientQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: null,
  categoryId: null,
  includeInactive: false,
};
const DEFAULT_MOVEMENT_QUERY: InventoryMovementQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  ingredientId: null,
  direction: null,
};
const DEFAULT_UNIT_QUERY: MeasurementUnitQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: null,
  includeInactive: false,
};

@Injectable()
export class InventoryStore {
  private readonly stockRepository = inject(STOCK_REPOSITORY);
  private readonly ingredientRepository = inject(INGREDIENT_REPOSITORY);
  private readonly movementRepository = inject(MOVEMENT_REPOSITORY);
  private readonly unitRepository = inject(MEASUREMENT_UNIT_REPOSITORY);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContext = inject(TenantContext);
  private readonly router = inject(Router);

  private readonly permissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly forbiddenPermissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly permissionsStatusState = signal<RequestStatus>('idle');
  private readonly permissionsErrorState = signal<InventoryFeatureError | null>(null);
  private readonly stockPageState = signal<PagedResponse<InventoryItem>>(EMPTY_PAGE());
  private readonly ingredientsPageState = signal<PagedResponse<Ingredient>>(EMPTY_PAGE());
  private readonly movementsPageState = signal<PagedResponse<InventoryMovement>>(EMPTY_PAGE());
  private readonly unitsPageState = signal<PagedResponse<MeasurementUnit>>(EMPTY_PAGE());
  private readonly stockStatusState = signal<RequestStatus>('idle');
  private readonly ingredientsStatusState = signal<RequestStatus>('idle');
  private readonly movementsStatusState = signal<RequestStatus>('idle');
  private readonly unitsStatusState = signal<RequestStatus>('idle');
  private readonly stockErrorState = signal<InventoryFeatureError | null>(null);
  private readonly ingredientsErrorState = signal<InventoryFeatureError | null>(null);
  private readonly movementsErrorState = signal<InventoryFeatureError | null>(null);
  private readonly unitsErrorState = signal<InventoryFeatureError | null>(null);
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly operationErrorState = signal<InventoryFeatureError | null>(null);
  private readonly lookupStatusState = signal<RequestStatus>('idle');
  private readonly categoriesState = signal<readonly CategoryReference[]>([]);
  private readonly activeUnitsState = signal<readonly MeasurementUnit[]>([]);
  private readonly activeIngredientsState = signal<readonly Ingredient[]>([]);
  private stockQuery: InventoryQuery = DEFAULT_STOCK_QUERY;
  private ingredientQuery: IngredientQuery = DEFAULT_INGREDIENT_QUERY;
  private movementQuery: InventoryMovementQuery = DEFAULT_MOVEMENT_QUERY;
  private unitQuery: MeasurementUnitQuery = DEFAULT_UNIT_QUERY;
  private scopedTenantId: string | null = null;
  private scopeVersion = 0;
  private listVersions = { stock: 0, ingredients: 0, movements: 0, units: 0 };
  private permissionsTenantId: string | null = null;
  private permissionsRequest?: Observable<readonly string[]>;

  readonly permissions = this.permissionsState.asReadonly();
  readonly permissionsStatus = this.permissionsStatusState.asReadonly();
  readonly permissionsError = this.permissionsErrorState.asReadonly();
  readonly stockPage = this.stockPageState.asReadonly();
  readonly ingredientsPage = this.ingredientsPageState.asReadonly();
  readonly movementsPage = this.movementsPageState.asReadonly();
  readonly unitsPage = this.unitsPageState.asReadonly();
  readonly stockStatus = this.stockStatusState.asReadonly();
  readonly ingredientsStatus = this.ingredientsStatusState.asReadonly();
  readonly movementsStatus = this.movementsStatusState.asReadonly();
  readonly unitsStatus = this.unitsStatusState.asReadonly();
  readonly stockError = this.stockErrorState.asReadonly();
  readonly ingredientsError = this.ingredientsErrorState.asReadonly();
  readonly movementsError = this.movementsErrorState.asReadonly();
  readonly unitsError = this.unitsErrorState.asReadonly();
  readonly mutationStatus = this.mutationStatusState.asReadonly();
  readonly operationError = this.operationErrorState.asReadonly();
  readonly lookupStatus = this.lookupStatusState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly activeUnits = this.activeUnitsState.asReadonly();
  readonly activeIngredients = this.activeIngredientsState.asReadonly();
  readonly permissionsLoading = computed(() => this.permissionsStatusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');

  constructor() {
    effect(() => {
      const tenantId = this.tenantContext.activeTenant()?.id ?? null;
      untracked(() => {
        if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
      });
    });
  }

  hasPermission(permission: InventoryPermission): boolean {
    return (
      this.permissionsState().has(permission) && !this.forbiddenPermissionsState().has(permission)
    );
  }

  ensurePermissions(): Observable<readonly string[]> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
    if (this.permissionsTenantId === tenantId && this.permissionsStatusState() === 'success') {
      return of([...this.permissionsState()]);
    }
    if (this.permissionsTenantId === tenantId && this.permissionsRequest) {
      return this.permissionsRequest;
    }

    const scopeVersion = this.scopeVersion;
    this.permissionsTenantId = tenantId;
    this.permissionsStatusState.set('loading');
    this.permissionsErrorState.set(null);
    const request = this.authStore.loadCurrentUser().pipe(
      map((user) => user.permissions),
      tap((permissions) => {
        if (!this.isCurrent(tenantId, scopeVersion)) return;
        this.permissionsState.set(new Set(permissions));
        this.permissionsStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.permissionsErrorState.set(this.mapError(error));
          this.permissionsStatusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.permissionsTenantId === tenantId) this.permissionsRequest = undefined;
        if (this.isCurrent(tenantId, scopeVersion) && this.permissionsStatusState() === 'loading') {
          this.permissionsStatusState.set('idle');
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.permissionsRequest = request;
    return request;
  }

  loadStock(query: InventoryQuery = this.stockQuery): Observable<PagedResponse<InventoryItem>> {
    this.stockQuery = query;
    return this.loadPage(
      'stock',
      'inventory.stock.read',
      this.stockRepository.list(query),
      this.stockPageState,
      this.stockStatusState,
      this.stockErrorState,
    );
  }

  loadIngredients(
    query: IngredientQuery = this.ingredientQuery,
  ): Observable<PagedResponse<Ingredient>> {
    this.ingredientQuery = query;
    return this.loadPage(
      'ingredients',
      'inventory.ingredients.read',
      this.ingredientRepository.list(query),
      this.ingredientsPageState,
      this.ingredientsStatusState,
      this.ingredientsErrorState,
    );
  }

  loadMovements(
    query: InventoryMovementQuery = this.movementQuery,
  ): Observable<PagedResponse<InventoryMovement>> {
    this.movementQuery = query;
    return this.loadPage(
      'movements',
      'inventory.movements.read',
      this.movementRepository.list(query),
      this.movementsPageState,
      this.movementsStatusState,
      this.movementsErrorState,
    );
  }

  loadUnits(
    query: MeasurementUnitQuery = this.unitQuery,
  ): Observable<PagedResponse<MeasurementUnit>> {
    this.unitQuery = query;
    return this.loadPage(
      'units',
      'inventory.complements.read',
      this.unitRepository.list(query),
      this.unitsPageState,
      this.unitsStatusState,
      this.unitsErrorState,
    );
  }

  loadIngredientLookups(): Observable<void> {
    const requests: Record<string, Observable<unknown>> = {};
    if (this.hasPermission('categories.read')) {
      requests['categories'] = this.ingredientRepository
        .listCategories()
        .pipe(tap((categories) => this.categoriesState.set(categories)));
    }
    if (this.hasPermission('inventory.complements.read')) {
      requests['units'] = this.unitRepository
        .list({ page: 1, pageSize: 100, search: null, includeInactive: false })
        .pipe(tap((page) => this.activeUnitsState.set(page.items)));
    }
    return this.loadLookups(requests);
  }

  loadActiveIngredients(): Observable<void> {
    if (!this.hasPermission('inventory.ingredients.read')) return of(undefined);
    return this.loadLookups({
      ingredients: this.ingredientRepository
        .list({
          page: 1,
          pageSize: 100,
          search: null,
          categoryId: null,
          includeInactive: false,
        })
        .pipe(tap((page) => this.activeIngredientsState.set(page.items))),
    });
  }

  createIngredient(request: CreateIngredientRequest): Observable<Ingredient> {
    return this.mutate(
      'inventory.ingredients.manage',
      this.ingredientRepository.create(request),
      () => this.loadIngredients(),
    );
  }

  updateIngredient(ingredientId: string, request: UpdateIngredientRequest): Observable<Ingredient> {
    return this.mutate(
      'inventory.ingredients.manage',
      this.ingredientRepository.update(ingredientId, request),
      () => this.loadIngredients(),
    );
  }

  setIngredientStatus(
    ingredientId: string,
    request: SetIngredientStatusRequest,
  ): Observable<Ingredient> {
    return this.mutate(
      'inventory.ingredients.manage',
      this.ingredientRepository.setStatus(ingredientId, request),
      () => this.loadIngredients(),
    );
  }

  deleteIngredient(ingredientId: string): Observable<void> {
    return this.mutate(
      'inventory.ingredients.manage',
      this.ingredientRepository.delete(ingredientId),
      () => this.loadIngredients(),
    );
  }

  createMovement(request: CreateInventoryMovementRequest): Observable<InventoryMovement> {
    return this.mutate('inventory.movements.manage', this.movementRepository.create(request), () =>
      forkJoin([this.loadMovements(), this.loadStock()]),
    );
  }

  createUnit(request: CreateMeasurementUnitRequest): Observable<MeasurementUnit> {
    return this.mutate('inventory.complements.manage', this.unitRepository.create(request), () =>
      this.loadUnits(),
    );
  }

  updateUnit(unitId: string, request: UpdateMeasurementUnitRequest): Observable<MeasurementUnit> {
    return this.mutate(
      'inventory.complements.manage',
      this.unitRepository.update(unitId, request),
      () => this.loadUnits(),
    );
  }

  setUnitStatus(
    unitId: string,
    request: SetMeasurementUnitStatusRequest,
  ): Observable<MeasurementUnit> {
    return this.mutate(
      'inventory.complements.manage',
      this.unitRepository.setStatus(unitId, request),
      () => this.loadUnits(),
    );
  }

  deleteUnit(unitId: string): Observable<void> {
    return this.mutate('inventory.complements.manage', this.unitRepository.delete(unitId), () =>
      this.loadUnits(),
    );
  }

  clearOperationError(): void {
    this.operationErrorState.set(null);
  }

  private loadPage<T>(
    key: keyof typeof this.listVersions,
    permission: InventoryPermission,
    request: Observable<PagedResponse<T>>,
    pageState: WritableSignal<PagedResponse<T>>,
    statusState: WritableSignal<RequestStatus>,
    errorState: WritableSignal<InventoryFeatureError | null>,
  ): Observable<PagedResponse<T>> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const scopeVersion = this.scopeVersion;
    const version = ++this.listVersions[key];
    statusState.set('loading');
    errorState.set(null);
    return request.pipe(
      tap((page) => {
        if (!this.isCurrent(tenantId, scopeVersion) || version !== this.listVersions[key]) return;
        pageState.set(page);
        statusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion) && version === this.listVersions[key]) {
          const mapped = this.handleError(error, permission);
          errorState.set(mapped);
          statusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (
          this.isCurrent(tenantId, scopeVersion) &&
          version === this.listVersions[key] &&
          statusState() === 'loading'
        ) {
          statusState.set('idle');
        }
      }),
    );
  }

  private loadLookups(requests: Record<string, Observable<unknown>>): Observable<void> {
    const entries = Object.entries(requests);
    if (entries.length === 0) return of(undefined);
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const scopeVersion = this.scopeVersion;
    this.lookupStatusState.set('loading');
    return forkJoin(requests).pipe(
      map(() => undefined),
      tap(() => {
        if (this.isCurrent(tenantId, scopeVersion)) this.lookupStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.operationErrorState.set(this.handleError(error));
          this.lookupStatusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.isCurrent(tenantId, scopeVersion) && this.lookupStatusState() === 'loading') {
          this.lookupStatusState.set('idle');
        }
      }),
    );
  }

  private mutate<T>(
    permission: InventoryPermission,
    request: Observable<T>,
    refresh: () => Observable<unknown>,
  ): Observable<T> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const scopeVersion = this.scopeVersion;
    this.mutationStatusState.set('loading');
    this.operationErrorState.set(null);
    return request.pipe(
      switchMap((result) =>
        refresh().pipe(
          catchError(() => of(undefined)),
          map(() => result),
        ),
      ),
      tap(() => {
        if (this.isCurrent(tenantId, scopeVersion)) this.mutationStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.operationErrorState.set(this.handleError(error, permission));
          this.mutationStatusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.isCurrent(tenantId, scopeVersion) && this.mutationStatusState() === 'loading') {
          this.mutationStatusState.set('idle');
        }
      }),
    );
  }

  private handleError(error: unknown, permission?: InventoryPermission): InventoryFeatureError {
    const mapped = this.mapError(error);
    if (mapped.status === 403 && mapped.code === 'TENANT_REQUIRED') {
      this.changeScope(null);
      this.tenantContext.clear();
      void this.router.navigate(['/select-tenant']);
    } else if (mapped.status === 403 && mapped.code === 'AUTH_FORBIDDEN' && permission) {
      this.forbiddenPermissionsState.update((permissions) => new Set([...permissions, permission]));
    }
    return mapped;
  }

  private mapError(error: unknown): InventoryFeatureError {
    if (error instanceof ApiError) {
      return {
        status: error.status,
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    return {
      status: 0,
      code: null,
      message: 'No pudimos completar la solicitud.',
      fieldErrors: {},
    };
  }

  private requireTenant(): string | null {
    const tenantId = this.tenantContext.activeTenant()?.id ?? null;
    if (!tenantId) void this.router.navigate(['/select-tenant']);
    else if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
    return tenantId;
  }

  private isCurrent(tenantId: string, scopeVersion: number): boolean {
    return (
      this.scopedTenantId === tenantId &&
      this.scopeVersion === scopeVersion &&
      this.tenantContext.activeTenant()?.id === tenantId
    );
  }

  private changeScope(tenantId: string | null): void {
    this.scopedTenantId = tenantId;
    this.scopeVersion += 1;
    this.listVersions = { stock: 0, ingredients: 0, movements: 0, units: 0 };
    this.permissionsTenantId = null;
    this.permissionsRequest = undefined;
    this.permissionsState.set(new Set());
    this.forbiddenPermissionsState.set(new Set());
    this.permissionsStatusState.set('idle');
    this.permissionsErrorState.set(null);
    this.stockPageState.set(EMPTY_PAGE());
    this.ingredientsPageState.set(EMPTY_PAGE());
    this.movementsPageState.set(EMPTY_PAGE());
    this.unitsPageState.set(EMPTY_PAGE());
    this.stockStatusState.set('idle');
    this.ingredientsStatusState.set('idle');
    this.movementsStatusState.set('idle');
    this.unitsStatusState.set('idle');
    this.stockErrorState.set(null);
    this.ingredientsErrorState.set(null);
    this.movementsErrorState.set(null);
    this.unitsErrorState.set(null);
    this.mutationStatusState.set('idle');
    this.operationErrorState.set(null);
    this.lookupStatusState.set('idle');
    this.categoriesState.set([]);
    this.activeUnitsState.set([]);
    this.activeIngredientsState.set([]);
    this.stockQuery = DEFAULT_STOCK_QUERY;
    this.ingredientQuery = DEFAULT_INGREDIENT_QUERY;
    this.movementQuery = DEFAULT_MOVEMENT_QUERY;
    this.unitQuery = DEFAULT_UNIT_QUERY;
  }
}
