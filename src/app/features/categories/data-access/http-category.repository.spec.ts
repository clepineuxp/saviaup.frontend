import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { CreateCategoryRequest, SetCategoryStatusRequest } from '../models/category.model';
import { CategoryDto } from './category.contracts';
import { HttpCategoryRepository } from './http-category.repository';

const dto: CategoryDto = {
  id: 'category-1',
  name: 'Bebidas frías',
  description: 'Preparadas en barra',
  imageUrl: 'https://cdn.example.com/drinks.webp',
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T18:00:00Z',
  updatedAt: '2026-08-20T18:00:00Z',
};

describe('HttpCategoryRepository', () => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const patch = vi.fn();
  const deleteRequest = vi.fn();
  let repository: HttpCategoryRepository;

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
    patch.mockReset();
    deleteRequest.mockReset();
    TestBed.configureTestingModule({
      providers: [
        HttpCategoryRepository,
        {
          provide: ApiClient,
          useValue: { get, post, put, patch, delete: deleteRequest },
        },
      ],
    });
    repository = TestBed.inject(HttpCategoryRepository);
  });

  it('requests the administrative list with includeInactive=true', async () => {
    get.mockReturnValue(of([dto]));

    await expect(firstValueFrom(repository.list(true))).resolves.toEqual([dto]);
    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.categories.root, {
      params: { includeInactive: true },
    });
  });

  it('uses the create and update contracts without binary payloads', async () => {
    const request: CreateCategoryRequest = {
      name: 'Bebidas frías',
      description: null,
      imageUrl: null,
      isInventoryTracked: true,
    };
    post.mockReturnValue(of(dto));
    put.mockReturnValue(of({ ...dto, name: 'Bebidas sin alcohol' }));

    await firstValueFrom(repository.create(request));
    await firstValueFrom(repository.update(dto.id, { ...request, name: 'Bebidas sin alcohol' }));

    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.categories.root, request);
    expect(put).toHaveBeenCalledWith(API_ENDPOINTS.categories.detail(dto.id), {
      ...request,
      name: 'Bebidas sin alcohol',
    });
  });

  it('changes status and deletes through their dedicated endpoints', async () => {
    const status: SetCategoryStatusRequest = { isActive: false };
    patch.mockReturnValue(of({ ...dto, isActive: false }));
    deleteRequest.mockReturnValue(of(undefined));

    await firstValueFrom(repository.setStatus(dto.id, status));
    await firstValueFrom(repository.delete(dto.id));

    expect(patch).toHaveBeenCalledWith(API_ENDPOINTS.categories.status(dto.id), status);
    expect(deleteRequest).toHaveBeenCalledWith(API_ENDPOINTS.categories.detail(dto.id));
  });
});
