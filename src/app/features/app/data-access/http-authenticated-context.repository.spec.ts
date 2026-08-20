import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { HttpAuthenticatedContextRepository } from './http-authenticated-context.repository';

describe('HttpAuthenticatedContextRepository', () => {
  const get = vi.fn();
  let repository: HttpAuthenticatedContextRepository;

  beforeEach(() => {
    get.mockReset();
    TestBed.configureTestingModule({
      providers: [HttpAuthenticatedContextRepository, { provide: ApiClient, useValue: { get } }],
    });
    repository = TestBed.inject(HttpAuthenticatedContextRepository);
  });

  it('maps current user information from the HTTP contract', async () => {
    get.mockReturnValue(
      of({
        firstName: 'Ana',
        lastName: 'Prueba',
        organization: { id: 'tenant-1', name: 'Secret Garden' },
        role: { id: 'role-1', code: 'TENANT_OWNER', name: 'Owner' },
      }),
    );

    await expect(firstValueFrom(repository.userInfo())).resolves.toEqual({
      firstName: 'Ana',
      lastName: 'Prueba',
      organization: { id: 'tenant-1', name: 'Secret Garden' },
      role: { id: 'role-1', code: 'TENANT_OWNER', name: 'Owner' },
    });
    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.users.info);
  });

  it('deserializes sections and uses their explicit order instead of alphabetic order', async () => {
    get.mockReturnValue(
      of({
        sections: [
          {
            code: 'operation',
            name: 'Backend Operation',
            order: 2,
            isGrouped: true,
            modules: [
              { id: 'reports', code: 'reports', name: 'Backend Reports', order: 2 },
              { id: 'orders', code: 'orders', name: 'Backend Orders', order: 1 },
            ],
            options: [
              {
                code: 'products.manage',
                moduleCode: 'products',
                name: 'Manage products',
                order: 3,
              },
            ],
          },
          {
            code: 'sales',
            name: 'Backend Sales',
            order: 1,
            isGrouped: false,
            modules: [{ id: 'tables', code: 'tables', name: 'Backend Tables', order: 1 }],
            options: [],
          },
        ],
        emptyStateMessage: null,
      }),
    );

    const result = await firstValueFrom(repository.availableModules('en'));

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.modules.available, {
      headers: { 'Accept-Language': 'en' },
    });
    expect(result.sections.map((section) => section.code)).toEqual(['sales', 'operation']);
    expect(result.sections[1]).toMatchObject({
      name: 'Backend Operation',
      isGrouped: true,
    });
    expect(result.sections[1].modules.map((module) => module.code)).toEqual(['orders', 'reports']);
    expect(result.sections[1].options).toEqual([
      {
        code: 'products.manage',
        moduleCode: 'products',
        name: 'Manage products',
        order: 3,
      },
    ]);
  });
});
