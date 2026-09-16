import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  IngredientDto,
  InventoryItemDto,
  InventoryMovementDto,
  MeasurementUnitDto,
  PagedResponseDto,
} from './inventory.contracts';
import { HttpIngredientRepository } from './http-ingredient.repository';
import { HttpMeasurementUnitRepository } from './http-measurement-unit.repository';
import { HttpMovementRepository } from './http-movement.repository';
import { HttpStockRepository } from './http-stock.repository';

const unit: MeasurementUnitDto = {
  id: 'unit-1',
  code: 'GR',
  name: 'Gramos',
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const category = { id: 'category-1', name: 'Materia prima', isInventoryTracked: true };
const ingredient: IngredientDto = {
  id: 'ingredient-1',
  name: 'Café',
  description: null,
  category,
  unit,
  minimumStock: 10,
  currentStock: 20,
  isBelowMinimum: false,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const stockItem: InventoryItemDto = {
  id: ingredient.id,
  itemType: 'ingredient',
  name: ingredient.name,
  category,
  unit,
  currentStock: 20,
  minimumStock: 10,
  isBelowMinimum: false,
};
const movement: InventoryMovementDto = {
  id: 'movement-1',
  ingredientId: ingredient.id,
  ingredientName: ingredient.name,
  unit,
  direction: 'increase',
  reason: 'purchase',
  quantity: 5,
  stockBefore: 15,
  stockAfter: 20,
  note: 'Compra semanal',
  createdByUserId: 'user-1',
  createdAt: '2026-08-20T12:00:00Z',
};

const page = <T>(items: readonly T[]): PagedResponseDto<T> => ({
  items,
  page: 1,
  pageSize: 20,
  totalCount: items.length,
  totalPages: items.length ? 1 : 0,
});

describe('inventory HTTP repositories', () => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const patchRequest = vi.fn();
  const deleteRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        HttpStockRepository,
        HttpIngredientRepository,
        HttpMovementRepository,
        HttpMeasurementUnitRepository,
        {
          provide: ApiClient,
          useValue: { get, post, put, patch: patchRequest, delete: deleteRequest },
        },
      ],
    });
  });

  it('sends server pagination and omits empty optional stock filters', async () => {
    get.mockReturnValue(of(page([stockItem])));

    const result = await firstValueFrom(
      TestBed.inject(HttpStockRepository).list({
        page: 1,
        pageSize: 20,
        search: null,
        belowMinimum: null,
      }),
    );

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.inventory.root, {
      params: { page: 1, pageSize: 20 },
    });
    expect(result.items[0]).toMatchObject({ itemType: 'ingredient', currentStock: 20 });
  });

  it('uses the distinct ingredient create and update payloads', async () => {
    const repository = TestBed.inject(HttpIngredientRepository);
    const createRequest = {
      categoryId: category.id,
      measurementUnitId: unit.id,
      name: 'Café',
      description: null,
      minimumStock: 0,
      initialStock: 5,
    };
    const updateRequest = {
      categoryId: category.id,
      measurementUnitId: unit.id,
      name: 'Café molido',
      description: null,
      minimumStock: 2,
    };
    post.mockReturnValue(of(ingredient));
    put.mockReturnValue(of({ ...ingredient, name: updateRequest.name }));

    await firstValueFrom(repository.create(createRequest));
    await firstValueFrom(repository.update(ingredient.id, updateRequest));

    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.inventory.ingredients.root, createRequest);
    expect(put).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.ingredients.detail(ingredient.id),
      updateRequest,
    );
    expect(updateRequest).not.toHaveProperty('initialStock');
  });

  it('sends movement filters and the immutable create contract', async () => {
    const repository = TestBed.inject(HttpMovementRepository);
    const request = {
      ingredientId: ingredient.id,
      direction: 'decrease' as const,
      reason: 'waste' as const,
      quantity: 2,
      note: null,
    };
    get.mockReturnValue(of(page([movement])));
    post.mockReturnValue(of(movement));

    await firstValueFrom(
      repository.list({
        page: 2,
        pageSize: 20,
        ingredientId: ingredient.id,
        direction: 'decrease',
      }),
    );
    await firstValueFrom(repository.create(request));

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.inventory.movements, {
      params: {
        page: 2,
        pageSize: 20,
        ingredientId: ingredient.id,
        direction: 'decrease',
      },
    });
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.inventory.movements, request);
  });

  it('uses dedicated unit CRUD and status endpoints', async () => {
    const repository = TestBed.inject(HttpMeasurementUnitRepository);
    get.mockReturnValue(of(page([unit])));
    patchRequest.mockReturnValue(of({ ...unit, isActive: false }));
    deleteRequest.mockReturnValue(of(undefined));

    await firstValueFrom(
      repository.list({ page: 1, pageSize: 20, search: 'gr', includeInactive: true }),
    );
    await firstValueFrom(repository.setStatus(unit.id, { isActive: false }));
    await firstValueFrom(repository.delete(unit.id));

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.inventory.complements.units, {
      params: { page: 1, pageSize: 20, search: 'gr', includeInactive: true },
    });
    expect(patchRequest).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.complements.unitStatus(unit.id),
      { isActive: false },
    );
    expect(deleteRequest).toHaveBeenCalledWith(API_ENDPOINTS.inventory.complements.unit(unit.id));
  });
});
