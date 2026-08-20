import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { User } from '../../../core/models/user.model';
import { ActiveTenant, TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { Category } from '../models/category.model';
import { CategoryStore } from './category-store.service';
import { CATEGORY_REPOSITORY, CategoryRepository } from './category.repository';

const category: Category = {
  id: 'category-1',
  name: 'Bebidas frías',
  description: 'Preparadas en barra',
  imageUrl: null,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T18:00:00Z',
  updatedAt: '2026-08-20T18:00:00Z',
};

const manager: User = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Savia',
  email: 'ana@savia.test',
  permissions: ['categories.read', 'categories.manage'],
};

const reader: User = { ...manager, permissions: ['categories.read'] };

class FakeCategoryRepository implements CategoryRepository {
  readonly list = vi.fn<(includeInactive: boolean) => Observable<readonly Category[]>>(() =>
    of([category]),
  );
  readonly create = vi.fn(() => of(category));
  readonly update = vi.fn(() => of(category));
  readonly setStatus = vi.fn(() => of(category));
  readonly delete = vi.fn(() => of(undefined));
}

describe('CategoryStore', () => {
  let store: CategoryStore;
  let repository: FakeCategoryRepository;
  const activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Secret Garden' });
  const currentUser = signal<User | null>(manager);
  const loadCurrentUser = vi.fn(() => of(manager));
  const navigate = vi.fn(() => Promise.resolve(true));

  beforeEach(() => {
    activeTenant.set({ id: 'tenant-1', name: 'Secret Garden' });
    currentUser.set(manager);
    loadCurrentUser.mockReset();
    loadCurrentUser.mockReturnValue(of(manager));
    navigate.mockClear();
    repository = new FakeCategoryRepository();
    TestBed.configureTestingModule({
      providers: [
        CategoryStore,
        { provide: CATEGORY_REPOSITORY, useValue: repository },
        {
          provide: AuthStore,
          useValue: { user: currentUser.asReadonly(), loadCurrentUser },
        },
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
    store = TestBed.inject(CategoryStore);
    TestBed.flushEffects();
  });

  it('loads all active and inactive categories for the tenant', async () => {
    await expect(firstValueFrom(store.load())).resolves.toEqual([category]);

    expect(repository.list).toHaveBeenCalledWith(true);
    expect(store.categories()).toEqual([category]);
    expect(store.canManage()).toBe(true);
  });

  it('supports a successful empty state and read-only permissions', async () => {
    repository.list.mockReturnValue(of([]));
    loadCurrentUser.mockReturnValue(of(reader));

    await firstValueFrom(store.load());

    expect(store.status()).toBe('success');
    expect(store.categories()).toEqual([]);
    expect(store.canManage()).toBe(false);
  });

  it('synchronizes create, edit, disable, reactivate and delete after success', async () => {
    await firstValueFrom(store.load());
    const created = { ...category, id: 'category-2', name: 'Postres' };
    repository.create.mockReturnValue(of(created));
    repository.update.mockReturnValue(of({ ...created, name: 'Postres fríos' }));
    repository.setStatus
      .mockReturnValueOnce(of({ ...created, name: 'Postres fríos', isActive: false }))
      .mockReturnValueOnce(of({ ...created, name: 'Postres fríos', isActive: true }));

    await firstValueFrom(
      store.create({
        name: created.name,
        description: null,
        imageUrl: null,
        isInventoryTracked: true,
      }),
    );
    await firstValueFrom(
      store.update(created.id, {
        name: 'Postres fríos',
        description: null,
        imageUrl: null,
        isInventoryTracked: true,
      }),
    );
    await firstValueFrom(store.setStatus(created.id, { isActive: false }));
    expect(store.categories().find((item) => item.id === created.id)?.isActive).toBe(false);
    await firstValueFrom(store.setStatus(created.id, { isActive: true }));
    expect(store.categories().find((item) => item.id === created.id)?.isActive).toBe(true);
    await firstValueFrom(store.delete(created.id));

    expect(store.categories()).toEqual([category]);
  });

  it('does not remove a category before delete is confirmed by the API', async () => {
    await firstValueFrom(store.load());
    const response = new Subject<undefined>();
    repository.delete.mockReturnValue(response);

    store.delete(category.id).subscribe();
    expect(store.categories()).toEqual([category]);

    response.next(undefined);
    response.complete();
    expect(store.categories()).toEqual([]);
  });

  it('exposes duplicate and backend validation errors to the form', async () => {
    await firstValueFrom(store.load());
    repository.create
      .mockReturnValueOnce(
        throwError(
          () => new ApiError('conflict', 409, 'Duplicate', {}, 'CATEGORY_NAME_ALREADY_EXISTS'),
        ),
      )
      .mockReturnValueOnce(
        throwError(
          () =>
            new ApiError(
              'validation',
              400,
              'Validation',
              { Name: ['Required'] },
              'VALIDATION_ERROR',
            ),
        ),
      );

    await expect(
      firstValueFrom(
        store.create({
          name: 'Bebidas frías',
          description: null,
          imageUrl: null,
          isInventoryTracked: true,
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.operationError()?.code).toBe('CATEGORY_NAME_ALREADY_EXISTS');

    await expect(
      firstValueFrom(
        store.create({
          name: '',
          description: null,
          imageUrl: null,
          isInventoryTracked: true,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(store.operationError()?.fieldErrors).toEqual({ Name: ['Required'] });
  });

  it('hides management after AUTH_FORBIDDEN and reloads after CATEGORY_NOT_FOUND', async () => {
    await firstValueFrom(store.load());
    repository.setStatus.mockReturnValue(
      throwError(() => new ApiError('unauthorized', 403, 'Forbidden', {}, 'AUTH_FORBIDDEN')),
    );

    await expect(
      firstValueFrom(store.setStatus(category.id, { isActive: false })),
    ).rejects.toMatchObject({ status: 403 });
    expect(store.canManage()).toBe(false);

    await firstValueFrom(store.load());
    repository.update.mockReturnValue(
      throwError(() => new ApiError('not-found', 404, 'Missing', {}, 'CATEGORY_NOT_FOUND')),
    );
    await expect(
      firstValueFrom(
        store.update(category.id, {
          name: category.name,
          description: null,
          imageUrl: null,
          isInventoryTracked: true,
        }),
      ),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.list).toHaveBeenCalledTimes(3);
    expect(store.operationError()?.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('handles unauthenticated, forbidden and recoverable list errors with retry', async () => {
    repository.list.mockReturnValueOnce(
      throwError(
        () => new ApiError('unauthenticated', 401, 'Session expired', {}, 'AUTH_UNAUTHENTICATED'),
      ),
    );
    await expect(firstValueFrom(store.load())).rejects.toMatchObject({ status: 401 });
    expect(store.status()).toBe('error');

    repository.list.mockReturnValueOnce(
      throwError(() => new ApiError('unauthorized', 403, 'Forbidden', {}, 'AUTH_FORBIDDEN')),
    );
    await expect(firstValueFrom(store.load())).rejects.toMatchObject({ status: 403 });
    expect(store.accessForbidden()).toBe(true);

    repository.list.mockReturnValueOnce(throwError(() => new ApiError('network', 0, 'Offline')));
    await expect(firstValueFrom(store.load())).rejects.toMatchObject({ kind: 'network' });
    repository.list.mockReturnValueOnce(of([category]));
    await expect(firstValueFrom(store.load())).resolves.toEqual([category]);
    expect(store.status()).toBe('success');
  });

  it('clears state and ignores pending responses after tenant change or logout', async () => {
    const pending = new Subject<readonly Category[]>();
    repository.list.mockReturnValue(pending);
    store.load().subscribe();

    activeTenant.set({ id: 'tenant-2', name: 'Savia Demo' });
    TestBed.flushEffects();
    pending.next([category]);
    pending.complete();
    expect(store.categories()).toEqual([]);

    repository.list.mockReturnValue(of([category]));
    await firstValueFrom(store.load());
    expect(store.categories()).toEqual([category]);
    activeTenant.set(null);
    TestBed.flushEffects();
    expect(store.categories()).toEqual([]);
    expect(store.canManage()).toBe(false);
  });

  it('returns to tenant selection when the API requires context', async () => {
    repository.list.mockReturnValue(
      throwError(() => new ApiError('unauthorized', 403, 'Tenant required', {}, 'TENANT_REQUIRED')),
    );

    await expect(firstValueFrom(store.load())).rejects.toMatchObject({ status: 403 });

    expect(activeTenant()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/select-tenant']);
  });
});
