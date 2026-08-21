import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { User } from '../../../core/models/user.model';
import { ActiveTenant, TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { Product, ProductPage } from '../models/product.model';
import { PRODUCT_REPOSITORY } from './product.repository';
import { ProductStore } from './product-store.service';

const category = { id: 'category-1', name: 'Comidas', isInventoryTracked: true };
const product: Product = {
  id: 'product-1',
  type: 'NORMAL',
  name: 'Hamburguesa',
  description: null,
  imageUrl: null,
  category,
  salePrice: 25000,
  preparationTimeMinutes: 15,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const page = (currentPage = 1): ProductPage => ({
  items: [product],
  page: currentPage,
  pageSize: 20,
  totalCount: 1,
  totalPages: currentPage,
});
const user: User = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Savia',
  email: 'ana@savia.test',
  permissions: ['products.read', 'products.manage', 'categories.read'],
};

describe('ProductStore', () => {
  const activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Secret Garden' });
  const repository = {
    list: vi.fn(),
    listCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
  };
  const loadCurrentUser = vi.fn(() => of(user));
  const navigate = vi.fn(() => Promise.resolve(true));
  let store: ProductStore;

  beforeEach(() => {
    vi.clearAllMocks();
    activeTenant.set({ id: 'tenant-1', name: 'Secret Garden' });
    loadCurrentUser.mockReturnValue(of(user));
    repository.list.mockReturnValue(of(page()));
    repository.listCategories.mockReturnValue(of([category]));
    repository.create.mockReturnValue(of(product));
    repository.delete.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        ProductStore,
        { provide: PRODUCT_REPOSITORY, useValue: repository },
        { provide: AuthStore, useValue: { loadCurrentUser } },
        {
          provide: TenantContext,
          useValue: {
            activeTenant: activeTenant.asReadonly(),
            clear: () => activeTenant.set(null),
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    });
    store = TestBed.inject(ProductStore);
    TestBed.flushEffects();
  });

  it('keeps the server query when a mutation refreshes the current page', async () => {
    await firstValueFrom(store.ensurePermissions());
    const query = {
      page: 3,
      pageSize: 20,
      search: 'hamburguesa',
      categoryId: category.id,
      type: 'NORMAL' as const,
      includeInactive: true,
    };
    repository.list.mockReturnValue(of(page(3)));
    await firstValueFrom(store.load(query));

    await firstValueFrom(
      store.create({
        type: 'NORMAL',
        name: product.name,
        categoryId: category.id,
        salePrice: product.salePrice,
        description: null,
        imageUrl: null,
        preparationTimeMinutes: null,
        isInventoryTracked: true,
      }),
    );

    expect(repository.list).toHaveBeenLastCalledWith(query);
    expect(store.page().page).toBe(3);
  });

  it('revokes only products.manage when the API denies a mutation', async () => {
    await firstValueFrom(store.ensurePermissions());
    repository.delete.mockReturnValue(
      throwError(() => new ApiError('unauthorized', 403, 'Forbidden', {}, 'AUTH_FORBIDDEN')),
    );

    await expect(firstValueFrom(store.delete(product.id))).rejects.toMatchObject({ status: 403 });

    expect(store.hasPermission('products.manage')).toBe(false);
    expect(store.hasPermission('products.read')).toBe(true);
    expect(store.hasPermission('categories.read')).toBe(true);
  });

  it('clears tenant-scoped products, categories and permissions after a tenant change', async () => {
    await firstValueFrom(store.ensurePermissions());
    await firstValueFrom(store.load());
    await firstValueFrom(store.loadCategories());
    expect(store.page().items).toEqual([product]);
    expect(store.categories()).toEqual([category]);

    activeTenant.set({ id: 'tenant-2', name: 'Savia Demo' });
    TestBed.flushEffects();

    expect(store.page().items).toEqual([]);
    expect(store.categories()).toEqual([]);
    expect(store.hasPermission('products.read')).toBe(false);
  });
});
