import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { User } from '../../../core/models/user.model';
import { ActiveTenant, TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import {
  Ingredient,
  InventoryItem,
  InventoryMovement,
  MeasurementUnit,
  PagedResponse,
} from '../models/inventory.model';
import { InventoryStore } from './inventory-store.service';
import {
  INGREDIENT_REPOSITORY,
  MEASUREMENT_UNIT_REPOSITORY,
  MOVEMENT_REPOSITORY,
  STOCK_REPOSITORY,
} from './inventory.repositories';

const category = { id: 'category-1', name: 'Materia prima', isInventoryTracked: true };
const unit: MeasurementUnit = {
  id: 'unit-1',
  code: 'GR',
  name: 'Gramos',
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const ingredient: Ingredient = {
  id: 'ingredient-1',
  name: 'Café',
  description: null,
  category,
  unit,
  minimumStock: 2,
  currentStock: 15,
  isBelowMinimum: false,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const stockItem: InventoryItem = {
  id: ingredient.id,
  itemType: 'ingredient',
  name: ingredient.name,
  category,
  unit,
  currentStock: 15,
  minimumStock: 2,
  isBelowMinimum: false,
};
const movement: InventoryMovement = {
  id: 'movement-1',
  ingredientId: ingredient.id,
  ingredientName: ingredient.name,
  unit,
  direction: 'increase',
  reason: 'purchase',
  quantity: 5,
  stockBefore: 10,
  stockAfter: 15,
  note: null,
  createdByUserId: 'user-1',
  createdAt: '2026-08-20T12:00:00Z',
};
const page = <T>(items: readonly T[], currentPage = 1): PagedResponse<T> => ({
  items,
  page: currentPage,
  pageSize: 20,
  totalCount: items.length,
  totalPages: items.length ? currentPage : 0,
});

const permissions = [
  'inventory.stock.read',
  'inventory.ingredients.read',
  'inventory.ingredients.manage',
  'inventory.movements.read',
  'inventory.movements.manage',
  'inventory.complements.read',
  'inventory.complements.manage',
  'categories.read',
];
const user: User = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Savia',
  email: 'ana@savia.test',
  permissions,
};

describe('InventoryStore', () => {
  const activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Secret Garden' });
  const stockRepository = { list: vi.fn() };
  const ingredientRepository = {
    list: vi.fn(),
    listCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
  };
  const movementRepository = { list: vi.fn(), create: vi.fn() };
  const unitRepository = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
  };
  const loadCurrentUser = vi.fn(() => of(user));
  const navigate = vi.fn(() => Promise.resolve(true));
  let store: InventoryStore;

  beforeEach(() => {
    vi.clearAllMocks();
    activeTenant.set({ id: 'tenant-1', name: 'Secret Garden' });
    loadCurrentUser.mockReturnValue(of(user));
    stockRepository.list.mockReturnValue(of(page([stockItem])));
    ingredientRepository.list.mockReturnValue(of(page([ingredient])));
    ingredientRepository.listCategories.mockReturnValue(of([category]));
    movementRepository.list.mockReturnValue(of(page([movement])));
    movementRepository.create.mockReturnValue(of(movement));
    unitRepository.list.mockReturnValue(of(page([unit])));
    unitRepository.delete.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        InventoryStore,
        { provide: STOCK_REPOSITORY, useValue: stockRepository },
        { provide: INGREDIENT_REPOSITORY, useValue: ingredientRepository },
        { provide: MOVEMENT_REPOSITORY, useValue: movementRepository },
        { provide: MEASUREMENT_UNIT_REPOSITORY, useValue: unitRepository },
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
    store = TestBed.inject(InventoryStore);
    TestBed.flushEffects();
  });

  it('keeps server filters and the current pages when a movement refreshes both lists', async () => {
    await firstValueFrom(store.ensurePermissions());
    const stockQuery = {
      page: 3,
      pageSize: 20,
      search: 'café',
      belowMinimum: true,
    } as const;
    const movementQuery = {
      page: 2,
      pageSize: 20,
      ingredientId: ingredient.id,
      direction: 'increase' as const,
    };
    stockRepository.list.mockReturnValue(of(page([stockItem], 3)));
    movementRepository.list.mockReturnValue(of(page([movement], 2)));
    await firstValueFrom(store.loadStock(stockQuery));
    await firstValueFrom(store.loadMovements(movementQuery));

    await firstValueFrom(
      store.createMovement({
        ingredientId: ingredient.id,
        direction: 'increase',
        reason: 'purchase',
        quantity: 5,
        note: null,
      }),
    );

    expect(stockRepository.list).toHaveBeenLastCalledWith(stockQuery);
    expect(movementRepository.list).toHaveBeenLastCalledWith(movementQuery);
    expect(store.stockPage().page).toBe(3);
    expect(store.movementsPage().page).toBe(2);
  });

  it('maps in-use and insufficient-stock errors without discarding list state', async () => {
    await firstValueFrom(store.ensurePermissions());
    await firstValueFrom(store.loadUnits());
    unitRepository.delete.mockReturnValue(
      throwError(
        () =>
          new ApiError(
            'conflict',
            409,
            'Measurement unit is in use',
            {},
            'MEASUREMENT_UNIT_IN_USE',
          ),
      ),
    );
    await expect(firstValueFrom(store.deleteUnit(unit.id))).rejects.toMatchObject({ status: 409 });
    expect(store.operationError()?.code).toBe('MEASUREMENT_UNIT_IN_USE');
    expect(store.unitsPage().items).toEqual([unit]);

    movementRepository.create.mockReturnValue(
      throwError(
        () =>
          new ApiError('validation', 422, 'Insufficient stock', {}, 'INVENTORY_INSUFFICIENT_STOCK'),
      ),
    );
    await expect(
      firstValueFrom(
        store.createMovement({
          ingredientId: ingredient.id,
          direction: 'decrease',
          reason: 'waste',
          quantity: 50,
          note: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(store.operationError()?.code).toBe('INVENTORY_INSUFFICIENT_STOCK');
  });

  it('revokes only the exact permission rejected by the API', async () => {
    await firstValueFrom(store.ensurePermissions());
    movementRepository.create.mockReturnValue(
      throwError(() => new ApiError('unauthorized', 403, 'Forbidden', {}, 'AUTH_FORBIDDEN')),
    );

    await expect(
      firstValueFrom(
        store.createMovement({
          ingredientId: ingredient.id,
          direction: 'increase',
          reason: 'purchase',
          quantity: 1,
          note: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(store.hasPermission('inventory.movements.manage')).toBe(false);
    expect(store.hasPermission('inventory.movements.read')).toBe(true);
    expect(store.hasPermission('inventory.ingredients.manage')).toBe(true);
  });

  it('clears tenant-scoped pages and permissions when the tenant changes', async () => {
    await firstValueFrom(store.ensurePermissions());
    await firstValueFrom(store.loadStock());
    expect(store.stockPage().items).toEqual([stockItem]);

    activeTenant.set({ id: 'tenant-2', name: 'Savia Demo' });
    TestBed.flushEffects();

    expect(store.stockPage().items).toEqual([]);
    expect(store.hasPermission('inventory.stock.read')).toBe(false);
  });
});
