import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  catchError,
  finalize,
  from,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiClient } from '../../../shared/api/api-client.service';
import { OfflineDatabaseService } from '../../../shared/offline/offline-database.service';
import { mapCategoryDto } from '../../categories/data-access/category.adapter';
import { CategoryDto } from '../../categories/data-access/category.contracts';
import { Category } from '../../categories/models/category.model';
import { mapProduct } from '../../products/data-access/product.adapter';
import { ProductDto } from '../../products/data-access/product.contracts';
import {
  Product,
  ProductCategory,
  ProductPage,
  ProductQuery,
} from '../../products/models/product.model';
import { DiningAreaTables } from '../models/table.model';
import { CatalogImageOptimizer } from './catalog-image-optimizer.service';
import { TableRealtimeClient, TableSalesDataInvalidatedEvent } from './table-realtime.client';

interface TableSalesCatalogVersionDto {
  readonly tenantId: string;
  readonly version: string;
  readonly lastModifiedAt: string;
}

interface TableSalesCatalogSnapshotDto extends TableSalesCatalogVersionDto {
  readonly categories: readonly CategoryDto[];
  readonly products: readonly ProductDto[];
  readonly areas: readonly DiningAreaTables[];
}

export interface TableSalesCatalogRecord extends TableSalesCatalogVersionDto {
  readonly synchronizedAt: string;
  readonly categories: readonly Category[];
  readonly products: readonly Product[];
  readonly areas: readonly DiningAreaTables[];
}

/** Persistent, tenant-isolated catalogue used by every table sale dialog. */
@Injectable({ providedIn: 'root' })
export class TableSalesCatalogCache {
  private readonly api = inject(ApiClient);
  private readonly tenant = inject(TenantContext);
  private readonly realtime = inject(TableRealtimeClient);
  private readonly offlineDatabase = inject(OfflineDatabaseService);
  private readonly imageOptimizer = inject(CatalogImageOptimizer);
  private readonly invalidations = new Subject<TableSalesDataInvalidatedEvent>();
  private readonly syncingState = signal(false);
  private readonly syncErrorState = signal<string | null>(null);
  private readonly lastSynchronizedAtState = signal<string | null>(null);
  private snapshot: TableSalesCatalogRecord | null = null;
  private scopedTenantId: string | null = null;
  private validationRequest?: Observable<TableSalesCatalogRecord>;
  private synchronizationRequest?: Observable<TableSalesCatalogRecord>;
  private pendingInvalidation: TableSalesDataInvalidatedEvent | null = null;

  readonly invalidations$ = this.invalidations.asObservable();
  readonly syncing = this.syncingState.asReadonly();
  readonly syncError = this.syncErrorState.asReadonly();
  readonly lastSynchronizedAt = this.lastSynchronizedAtState.asReadonly();

  constructor() {
    effect(() => {
      const tenantId = this.tenant.activeTenant()?.id ?? null;
      untracked(() => {
        if (tenantId === this.scopedTenantId) return;
        this.scopedTenantId = tenantId;
        this.snapshot = null;
        this.validationRequest = undefined;
        this.synchronizationRequest = undefined;
        this.pendingInvalidation = null;
        this.syncingState.set(false);
        this.syncErrorState.set(null);
        this.lastSynchronizedAtState.set(null);
      });
    });
    this.realtime.salesDataInvalidations$.subscribe((event) => this.handleInvalidation(event));
  }

  prepare(): Observable<TableSalesCatalogRecord> {
    return this.validateAndSynchronize();
  }

  validateAndSynchronize(): Observable<TableSalesCatalogRecord> {
    const tenantId = this.requireTenant();
    if (this.validationRequest) return this.validationRequest;
    void this.realtime.connect().catch(() => undefined);

    let localCatalog: TableSalesCatalogRecord | null = null;
    const request = from(this.loadTenantCatalog(tenantId)).pipe(
      tap((catalog) => {
        localCatalog = catalog;
        if (catalog) this.acceptSnapshot(catalog);
      }),
      switchMap((catalog) =>
        this.api
          .get<TableSalesCatalogVersionDto>(API_ENDPOINTS.tables.salesCatalog.version)
          .pipe(
            switchMap((serverVersion) => this.resolveVersion(serverVersion, catalog, tenantId)),
          ),
      ),
      catchError((error: unknown) => {
        if (this.tenant.activeTenant()?.id !== tenantId) return throwError(() => error);
        this.syncErrorState.set('No fue posible sincronizar el catálogo de venta.');
        return localCatalog ? of(localCatalog) : throwError(() => error);
      }),
      finalize(() => {
        if (this.validationRequest !== request) return;
        this.validationRequest = undefined;
        queueMicrotask(() => this.processPendingInvalidation());
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.validationRequest = request;
    return request;
  }

  listCategories(): Observable<readonly ProductCategory[]> {
    return this.catalogForRead().pipe(
      map((catalog) =>
        catalog.categories.map((category) => ({
          id: category.id,
          name: category.name,
          isInventoryTracked: category.isInventoryTracked,
        })),
      ),
    );
  }

  listProducts(query: ProductQuery): Observable<ProductPage> {
    return this.catalogForRead().pipe(
      map((catalog) => {
        const search = this.normalize(query.search);
        const filtered = catalog.products.filter(
          (product) =>
            (query.includeInactive || product.isActive) &&
            (!query.categoryId || product.category.id === query.categoryId) &&
            (!query.type || product.type === query.type) &&
            (!search ||
              this.normalize(product.name).includes(search) ||
              product.variations.some((variation) =>
                this.normalize(variation.name).includes(search),
              )),
        );
        const pageSize = Math.max(1, query.pageSize);
        const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
        const page = Math.min(Math.max(1, query.page), Math.max(1, totalPages));
        const start = (page - 1) * pageSize;
        return {
          items: filtered.slice(start, start + pageSize),
          page,
          pageSize,
          totalCount: filtered.length,
          totalPages,
        };
      }),
    );
  }

  retrySynchronization(): void {
    this.syncErrorState.set(null);
    this.validateAndSynchronize().subscribe({ error: () => undefined });
  }

  private catalogForRead(): Observable<TableSalesCatalogRecord> {
    const tenantId = this.requireTenant();
    if (this.snapshot?.tenantId === tenantId) return of(this.snapshot);
    return from(this.loadTenantCatalog(tenantId)).pipe(
      switchMap((catalog) => {
        if (catalog) {
          this.acceptSnapshot(catalog);
          return of(catalog);
        }
        return this.validateAndSynchronize();
      }),
    );
  }

  private synchronizeFromServer(tenantId: string): Observable<TableSalesCatalogRecord> {
    if (this.synchronizationRequest) return this.synchronizationRequest;
    this.syncingState.set(true);
    this.syncErrorState.set(null);
    const request = this.api
      .get<TableSalesCatalogSnapshotDto>(API_ENDPOINTS.tables.salesCatalog.sync)
      .pipe(
        switchMap((response) => from(this.optimizeAndPersist(response, tenantId))),
        tap((catalog) => {
          if (this.tenant.activeTenant()?.id === tenantId) this.acceptSnapshot(catalog);
        }),
        finalize(() => {
          if (this.synchronizationRequest !== request) return;
          this.syncingState.set(false);
          this.synchronizationRequest = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.synchronizationRequest = request;
    return request;
  }

  private resolveVersion(
    serverVersion: TableSalesCatalogVersionDto,
    catalog: TableSalesCatalogRecord | null,
    tenantId: string,
  ): Observable<TableSalesCatalogRecord> {
    this.ensureActiveTenant(serverVersion.tenantId, tenantId);
    return catalog?.version === serverVersion.version
      ? of(catalog)
      : this.synchronizeFromServer(tenantId);
  }

  private async optimizeAndPersist(
    response: TableSalesCatalogSnapshotDto,
    expectedTenantId: string,
  ): Promise<TableSalesCatalogRecord> {
    this.ensureActiveTenant(response.tenantId, expectedTenantId);
    const categories = await this.optimizeImages(response.categories.map(mapCategoryDto));
    const products = await this.optimizeImages(response.products.map(mapProduct));
    this.ensureActiveTenant(response.tenantId, expectedTenantId);
    const catalog: TableSalesCatalogRecord = {
      tenantId: response.tenantId,
      version: response.version,
      lastModifiedAt: response.lastModifiedAt,
      synchronizedAt: new Date().toISOString(),
      categories,
      products,
      areas: response.areas,
    };
    await this.offlineDatabase.putSalesCatalog(catalog);
    if (this.tenant.activeTenant()?.id !== expectedTenantId) {
      await this.offlineDatabase.clearSalesCatalog();
      throw new Error('El tenant activo cambió durante la sincronización del catálogo.');
    }
    return catalog;
  }

  private async optimizeImages<T extends { readonly image: string | null }>(
    items: readonly T[],
  ): Promise<readonly T[]> {
    const optimized = new Array<T>(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(4, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        const item = items[index];
        optimized[index] = { ...item, image: await this.imageOptimizer.optimize(item.image) };
      }
    });
    await Promise.all(workers);
    return optimized;
  }

  private async loadTenantCatalog(tenantId: string): Promise<TableSalesCatalogRecord | null> {
    const catalog = (await this.offlineDatabase.getSalesCatalog<TableSalesCatalogRecord>()) ?? null;
    if (!catalog || catalog.tenantId === tenantId) return catalog;
    await this.offlineDatabase.clearSalesCatalog();
    return null;
  }

  private acceptSnapshot(catalog: TableSalesCatalogRecord): void {
    this.snapshot = catalog;
    this.lastSynchronizedAtState.set(catalog.synchronizedAt);
    this.syncErrorState.set(null);
  }

  private handleInvalidation(event: TableSalesDataInvalidatedEvent): void {
    if (
      !this.tenant.activeTenant()?.id ||
      !event.resources.some(
        (resource) => resource === 'products' || resource === 'categories' || resource === 'tables',
      )
    )
      return;
    this.pendingInvalidation = event;
    this.processPendingInvalidation();
  }

  private processPendingInvalidation(): void {
    if (!this.pendingInvalidation || this.validationRequest) return;
    const event = this.pendingInvalidation;
    this.pendingInvalidation = null;
    this.validateAndSynchronize().subscribe({
      next: () => this.invalidations.next(event),
      error: () => undefined,
    });
  }

  private normalize(value: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private ensureActiveTenant(responseTenantId: string, expectedTenantId: string): void {
    if (
      responseTenantId !== expectedTenantId ||
      this.tenant.activeTenant()?.id !== expectedTenantId
    )
      throw new Error('La sincronización del catálogo no corresponde al tenant activo.');
  }

  private requireTenant(): string {
    const tenantId = this.tenant.activeTenant()?.id;
    if (!tenantId) throw new Error('A tenant is required to access the sales catalogue.');
    return tenantId;
  }
}
