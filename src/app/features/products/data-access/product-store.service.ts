import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
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
  CreateProductRequest,
  EMPTY_PRODUCT_PAGE,
  Product,
  ProductCategory,
  ProductPage,
  ProductQuery,
  SetProductStatusRequest,
  UpdateProductRequest,
} from '../models/product.model';
import { ProductPermission } from '../product-permissions';
import { PRODUCT_REPOSITORY } from './product.repository';

export interface ProductFeatureError {
  readonly status: number;
  readonly code: string | null;
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
}

const DEFAULT_QUERY: ProductQuery = {
  page: 1,
  pageSize: 20,
  search: null,
  categoryId: null,
  type: null,
  includeInactive: false,
};

@Injectable()
export class ProductStore {
  private readonly repository = inject(PRODUCT_REPOSITORY);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContext = inject(TenantContext);
  private readonly router = inject(Router);
  private readonly permissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly forbiddenPermissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly permissionsStatusState = signal<RequestStatus>('idle');
  private readonly pageState = signal<ProductPage>(EMPTY_PRODUCT_PAGE());
  private readonly categoriesState = signal<readonly ProductCategory[]>([]);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly lookupStatusState = signal<RequestStatus>('idle');
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<ProductFeatureError | null>(null);
  private readonly operationErrorState = signal<ProductFeatureError | null>(null);
  private scopedTenantId: string | null = null;
  private scopeVersion = 0;
  private loadVersion = 0;
  private permissionsTenantId: string | null = null;
  private permissionsRequest?: Observable<readonly string[]>;
  private currentQuery = DEFAULT_QUERY;

  readonly page = this.pageState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly lookupStatus = this.lookupStatusState.asReadonly();
  readonly mutationStatus = this.mutationStatusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operationError = this.operationErrorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');

  constructor() {
    effect(() => {
      const tenantId = this.tenantContext.activeTenant()?.id ?? null;
      untracked(() => {
        if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
      });
    });
  }

  hasPermission(permission: ProductPermission): boolean {
    return (
      this.permissionsState().has(permission) && !this.forbiddenPermissionsState().has(permission)
    );
  }

  ensurePermissions(): Observable<readonly string[]> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    if (this.permissionsTenantId === tenantId && this.permissionsStatusState() === 'success') {
      return of([...this.permissionsState()]);
    }
    if (this.permissionsTenantId === tenantId && this.permissionsRequest) {
      return this.permissionsRequest;
    }

    const scopeVersion = this.scopeVersion;
    this.permissionsTenantId = tenantId;
    this.permissionsStatusState.set('loading');
    const request = this.authStore.loadCurrentUser().pipe(
      map((user) => user.permissions),
      tap((permissions) => {
        if (!this.isCurrent(tenantId, scopeVersion)) return;
        this.permissionsState.set(new Set(permissions));
        this.permissionsStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.permissionsStatusState.set('error');
          this.errorState.set(this.handleError(error));
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.permissionsTenantId === tenantId) this.permissionsRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.permissionsRequest = request;
    return request;
  }

  load(query: ProductQuery = this.currentQuery): Observable<ProductPage> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    this.currentQuery = query;
    const scopeVersion = this.scopeVersion;
    const loadVersion = ++this.loadVersion;
    this.statusState.set('loading');
    this.errorState.set(null);
    return this.repository.list(query).pipe(
      tap((page) => {
        if (!this.isCurrent(tenantId, scopeVersion) || loadVersion !== this.loadVersion) return;
        this.pageState.set(page);
        this.statusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion) && loadVersion === this.loadVersion) {
          this.errorState.set(this.handleError(error, 'products.read'));
          this.statusState.set('error');
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (
          this.isCurrent(tenantId, scopeVersion) &&
          loadVersion === this.loadVersion &&
          this.statusState() === 'loading'
        ) {
          this.statusState.set('idle');
        }
      }),
    );
  }

  loadCategories(): Observable<readonly ProductCategory[]> {
    if (!this.hasPermission('categories.read')) {
      this.categoriesState.set([]);
      return of([]);
    }
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const scopeVersion = this.scopeVersion;
    this.lookupStatusState.set('loading');
    return this.repository.listCategories().pipe(
      tap((categories) => {
        if (!this.isCurrent(tenantId, scopeVersion)) return;
        this.categoriesState.set(categories);
        this.lookupStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.operationErrorState.set(this.handleError(error, 'categories.read'));
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

  create(request: CreateProductRequest): Observable<Product> {
    return this.mutate(this.repository.create(request));
  }

  update(productId: string, request: UpdateProductRequest): Observable<Product> {
    return this.mutate(this.repository.update(productId, request));
  }

  setStatus(productId: string, request: SetProductStatusRequest): Observable<Product> {
    return this.mutate(this.repository.setStatus(productId, request));
  }

  delete(productId: string): Observable<void> {
    return this.mutate(this.repository.delete(productId));
  }

  clearOperationError(): void {
    this.operationErrorState.set(null);
  }

  private mutate<T>(request: Observable<T>): Observable<T> {
    const tenantId = this.requireTenant();
    if (!tenantId) return EMPTY;
    const scopeVersion = this.scopeVersion;
    this.mutationStatusState.set('loading');
    this.operationErrorState.set(null);
    return request.pipe(
      switchMap((result) =>
        this.load().pipe(
          catchError(() => of(undefined)),
          map(() => result),
        ),
      ),
      tap(() => {
        if (this.isCurrent(tenantId, scopeVersion)) this.mutationStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion)) {
          this.operationErrorState.set(this.handleError(error, 'products.manage'));
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

  private handleError(error: unknown, permission?: ProductPermission): ProductFeatureError {
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

  private mapError(error: unknown): ProductFeatureError {
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
    this.loadVersion += 1;
    this.permissionsTenantId = null;
    this.permissionsRequest = undefined;
    this.permissionsState.set(new Set());
    this.forbiddenPermissionsState.set(new Set());
    this.permissionsStatusState.set('idle');
    this.pageState.set(EMPTY_PRODUCT_PAGE());
    this.categoriesState.set([]);
    this.statusState.set('idle');
    this.lookupStatusState.set('idle');
    this.mutationStatusState.set('idle');
    this.errorState.set(null);
    this.operationErrorState.set(null);
    this.currentQuery = DEFAULT_QUERY;
  }
}
