import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { CreateProductRequest } from '../models/product.model';
import { HttpProductRepository } from './http-product.repository';
import { ProductDto } from './product.contracts';

const product: ProductDto = {
  id: 'product-1',
  type: 'NORMAL',
  name: 'Hamburguesa',
  description: null,
  imageUrl: null,
  category: { id: 'category-1', name: 'Comidas', isInventoryTracked: true },
  salePrice: 25000,
  preparationTimeMinutes: 15,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};

describe('HttpProductRepository', () => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const patchRequest = vi.fn();
  const deleteRequest = vi.fn();
  let repository: HttpProductRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        HttpProductRepository,
        {
          provide: ApiClient,
          useValue: { get, post, put, patch: patchRequest, delete: deleteRequest },
        },
      ],
    });
    repository = TestBed.inject(HttpProductRepository);
  });

  it('sends pagination and only populated product filters', async () => {
    get.mockReturnValue(
      of({ items: [product], page: 2, pageSize: 20, totalCount: 21, totalPages: 2 }),
    );

    const result = await firstValueFrom(
      repository.list({
        page: 2,
        pageSize: 20,
        search: 'hamburguesa',
        categoryId: null,
        type: 'NORMAL',
        includeInactive: false,
      }),
    );

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.products.root, {
      params: {
        page: 2,
        pageSize: 20,
        search: 'hamburguesa',
        type: 'NORMAL',
        includeInactive: false,
      },
    });
    expect(result.items[0]).toMatchObject({ id: product.id, type: 'NORMAL' });
  });

  it('uses category lookup and dedicated CRUD/status endpoints', async () => {
    const request: CreateProductRequest = {
      type: 'COMBO',
      name: 'Combo almuerzo',
      categoryId: product.category.id,
      salePrice: 32000,
      description: null,
      imageUrl: null,
      preparationTimeMinutes: 20,
      isInventoryTracked: true,
    };
    get.mockReturnValue(of([product.category]));
    post.mockReturnValue(of({ ...product, ...request }));
    put.mockReturnValue(of({ ...product, ...request }));
    patchRequest.mockReturnValue(of({ ...product, isActive: false }));
    deleteRequest.mockReturnValue(of(undefined));

    await firstValueFrom(repository.listCategories());
    await firstValueFrom(repository.create(request));
    await firstValueFrom(repository.update(product.id, request));
    await firstValueFrom(repository.setStatus(product.id, { isActive: false }));
    await firstValueFrom(repository.delete(product.id));

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.categories.root, {
      params: { includeInactive: false },
    });
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.products.root, request);
    expect(put).toHaveBeenCalledWith(API_ENDPOINTS.products.detail(product.id), request);
    expect(patchRequest).toHaveBeenCalledWith(API_ENDPOINTS.products.status(product.id), {
      isActive: false,
    });
    expect(deleteRequest).toHaveBeenCalledWith(API_ENDPOINTS.products.detail(product.id));
  });
});
