import { inject, Injectable } from '@angular/core';
import { finalize, forkJoin, map, Observable, of, shareReplay, Subject, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiClient } from '../../../shared/api/api-client.service';
import { mapProductCategory, mapProductPage } from '../../products/data-access/product.adapter';
import {
  ProductCategoryLookupDto,
  ProductPageDto,
} from '../../products/data-access/product.contracts';
import { ProductCategory, ProductPage, ProductQuery } from '../../products/models/product.model';
import { TableRealtimeClient, TableSalesDataInvalidatedEvent } from './table-realtime.client';

const compactParams = <T extends object>(values: T) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== ''));

/** Tenant-isolated in-memory catalogue shared by every visit to /sell/tables. */
@Injectable({ providedIn: 'root' })
export class TableSalesCatalogCache {
  private readonly api = inject(ApiClient);
  private readonly tenant = inject(TenantContext);
  private readonly realtime = inject(TableRealtimeClient);
  private readonly pages = new Map<string, ProductPage>();
  private readonly categories = new Map<string, readonly ProductCategory[]>();
  private readonly pageRequests = new Map<string, Observable<ProductPage>>();
  private readonly categoryRequests = new Map<string, Observable<readonly ProductCategory[]>>();
  private readonly invalidations = new Subject<TableSalesDataInvalidatedEvent>();

  readonly invalidations$ = this.invalidations.asObservable();

  constructor() {
    this.realtime.salesDataInvalidations$.subscribe((event) => this.handleInvalidation(event));
  }

  prepare(): Observable<unknown> {
    void this.realtime.connect().catch(() => undefined);
    return forkJoin([this.listCategories(), this.listProducts(this.defaultQuery())]);
  }

  listCategories(): Observable<readonly ProductCategory[]> {
    const tenantId = this.requireTenant();
    const key = `${tenantId}:categories`;
    const cached = this.categories.get(key);
    if (cached) return of(cached);
    const pending = this.categoryRequests.get(key);
    if (pending) return pending;
    const request = this.api
      .get<readonly ProductCategoryLookupDto[]>(API_ENDPOINTS.categories.root, {
        params: { includeInactive: false, onlyWithProducts: true },
      })
      .pipe(
        map((items) => items.map(mapProductCategory)),
        tap((items) => this.categories.set(key, items)),
        finalize(() => this.categoryRequests.delete(key)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.categoryRequests.set(key, request);
    return request;
  }

  listProducts(query: ProductQuery): Observable<ProductPage> {
    const tenantId = this.requireTenant();
    const key = `${tenantId}:products:${JSON.stringify(query)}`;
    const cached = this.pages.get(key);
    if (cached) return of(cached);
    const pending = this.pageRequests.get(key);
    if (pending) return pending;
    const request = this.api
      .get<ProductPageDto>(API_ENDPOINTS.products.root, { params: compactParams(query) })
      .pipe(
        map(mapProductPage),
        tap((page) => this.pages.set(key, page)),
        finalize(() => this.pageRequests.delete(key)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.pageRequests.set(key, request);
    return request;
  }

  private handleInvalidation(event: TableSalesDataInvalidatedEvent): void {
    const tenantId = this.tenant.activeTenant()?.id;
    if (
      !tenantId ||
      (!event.resources.includes('products') && !event.resources.includes('categories'))
    )
      return;
    for (const key of this.pages.keys())
      if (key.startsWith(`${tenantId}:products:`)) this.pages.delete(key);
    this.categories.delete(`${tenantId}:categories`);
    this.invalidations.next(event);
    this.prepare().subscribe({ error: () => undefined });
  }

  private defaultQuery(): ProductQuery {
    return {
      page: 1,
      pageSize: 100,
      search: null,
      categoryId: null,
      type: null,
      includeInactive: false,
    };
  }

  private requireTenant(): string {
    const tenantId = this.tenant.activeTenant()?.id;
    if (!tenantId) throw new Error('A tenant is required to access the sales catalogue.');
    return tenantId;
  }
}
