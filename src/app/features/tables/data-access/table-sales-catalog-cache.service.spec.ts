import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiClient } from '../../../shared/api/api-client.service';
import { OfflineDatabaseService } from '../../../shared/offline/offline-database.service';
import { ProductQuery } from '../../products/models/product.model';
import { CatalogImageOptimizer } from './catalog-image-optimizer.service';
import { TableRealtimeClient, TableSalesDataInvalidatedEvent } from './table-realtime.client';
import {
  TableSalesCatalogCache,
  TableSalesCatalogRecord,
} from './table-sales-catalog-cache.service';

describe('TableSalesCatalogCache', () => {
  const tenantState = signal({ id: 'tenant-1', name: 'Savia' });
  let invalidations = new Subject<TableSalesDataInvalidatedEvent>();
  const api = { get: vi.fn() };
  const offline = {
    getSalesCatalog: vi.fn(),
    putSalesCatalog: vi.fn(),
    clearSalesCatalog: vi.fn(),
  };
  const realtime = {
    connect: vi.fn(),
    salesDataInvalidations$: invalidations.asObservable(),
  };
  const imageOptimizer = { optimize: vi.fn() };
  let cache: TableSalesCatalogCache;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidations = new Subject<TableSalesDataInvalidatedEvent>();
    realtime.salesDataInvalidations$ = invalidations.asObservable();
    tenantState.set({ id: 'tenant-1', name: 'Savia' });
    offline.getSalesCatalog.mockResolvedValue(undefined);
    offline.putSalesCatalog.mockResolvedValue(undefined);
    offline.clearSalesCatalog.mockResolvedValue(undefined);
    realtime.connect.mockResolvedValue(undefined);
    imageOptimizer.optimize.mockImplementation((image: string | null) => Promise.resolve(image));
    TestBed.configureTestingModule({
      providers: [
        TableSalesCatalogCache,
        { provide: ApiClient, useValue: api },
        { provide: TenantContext, useValue: { activeTenant: tenantState.asReadonly() } },
        { provide: OfflineDatabaseService, useValue: offline },
        { provide: TableRealtimeClient, useValue: realtime },
        { provide: CatalogImageOptimizer, useValue: imageOptimizer },
      ],
    });
    cache = TestBed.inject(TableSalesCatalogCache);
  });

  it('synchronizes the complete snapshot and filters products locally', async () => {
    api.get.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.tables.salesCatalog.version)
        return of({ tenantId: 'tenant-1', version: 'v2', lastModifiedAt: '2026-09-22' });
      return of(syncResponse('v2'));
    });

    await firstValueFrom(cache.validateAndSynchronize());
    const page = await firstValueFrom(cache.listProducts(query({ categoryId: 'category-1' })));
    const variationSearch = await firstValueFrom(cache.listProducts(query({ search: 'grande' })));

    expect(page.items.map((product) => product.id)).toEqual(['product-1']);
    expect(variationSearch.items.map((product) => product.id)).toEqual(['product-1']);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(offline.putSalesCatalog).toHaveBeenCalledOnce();
    expect(imageOptimizer.optimize).toHaveBeenCalledWith('data:image/png;base64,large');
  });

  it('keeps a current tenant snapshot without downloading it again', async () => {
    const stored = storedCatalog('v1');
    offline.getSalesCatalog.mockResolvedValue(stored);
    api.get.mockReturnValue(
      of({ tenantId: 'tenant-1', version: 'v1', lastModifiedAt: '2026-09-22' }),
    );

    const result = await firstValueFrom(cache.validateAndSynchronize());

    expect(result).toEqual(stored);
    expect(api.get).toHaveBeenCalledOnce();
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.tables.salesCatalog.version);
    expect(offline.putSalesCatalog).not.toHaveBeenCalled();
  });

  it('checks the version again and refreshes after a SignalR invalidation', async () => {
    offline.getSalesCatalog.mockResolvedValue(storedCatalog('v1'));
    api.get.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.tables.salesCatalog.version)
        return of({ tenantId: 'tenant-1', version: 'v2', lastModifiedAt: '2026-09-22' });
      return of(syncResponse('v2'));
    });
    const refreshed = firstValueFrom(cache.invalidations$);

    invalidations.next({ resources: ['products'], occurredAt: '2026-09-22T12:05:00Z' });

    await expect(refreshed).resolves.toEqual({
      resources: ['products'],
      occurredAt: '2026-09-22T12:05:00Z',
    });
    expect(offline.putSalesCatalog).toHaveBeenCalledOnce();
  });

  it('rejects a snapshot that belongs to a different tenant', async () => {
    api.get.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.tables.salesCatalog.version)
        return of({ tenantId: 'tenant-1', version: 'v2', lastModifiedAt: '2026-09-22' });
      return of({ ...syncResponse('v2'), tenantId: 'tenant-2' });
    });

    await expect(firstValueFrom(cache.validateAndSynchronize())).rejects.toThrow(
      'La sincronización del catálogo no corresponde al tenant activo.',
    );
    expect(offline.putSalesCatalog).not.toHaveBeenCalled();
  });
});

const query = (overrides: Partial<ProductQuery> = {}): ProductQuery => ({
  page: 1,
  pageSize: 100,
  search: null,
  categoryId: null,
  type: null,
  includeInactive: false,
  ...overrides,
});

const syncResponse = (version: string) => ({
  tenantId: 'tenant-1',
  version,
  lastModifiedAt: '2026-09-22T12:00:00Z',
  categories: [
    {
      id: 'category-1',
      name: 'Bebidas',
      description: null,
      image: null,
      isInventoryTracked: false,
      isActive: true,
      createdAt: '2026-09-22T12:00:00Z',
      updatedAt: '2026-09-22T12:00:00Z',
    },
  ],
  products: [
    {
      id: 'product-1',
      type: 'NORMAL',
      name: 'Limonada',
      description: null,
      image: 'data:image/png;base64,large',
      category: { id: 'category-1', name: 'Bebidas', isInventoryTracked: false },
      salePrice: 12000,
      preparationTimeMinutes: 5,
      isInventoryTracked: false,
      isActive: true,
      createdAt: '2026-09-22T12:00:00Z',
      updatedAt: '2026-09-22T12:00:00Z',
      recipe: [],
      variations: [
        { id: 'variation-1', name: 'Grande', salePrice: 16000, order: 1, isActive: true },
      ],
    },
  ],
  areas: [],
});

const storedCatalog = (version: string): TableSalesCatalogRecord => ({
  tenantId: 'tenant-1',
  version,
  lastModifiedAt: '2026-09-22T12:00:00Z',
  synchronizedAt: '2026-09-22T12:01:00Z',
  categories: [],
  products: [],
  areas: [],
});
