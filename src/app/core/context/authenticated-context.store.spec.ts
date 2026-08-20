import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/http/api-error';
import { LocalizationService } from '../../shared/i18n/localization.service';
import { SupportedLanguage } from '../../shared/i18n/translation.types';
import { ActiveTenant, TenantContext } from '../tenant/tenant-context.service';
import {
  AUTHENTICATED_CONTEXT_REPOSITORY,
  AuthenticatedContextRepository,
} from './authenticated-context.repository';
import { AvailableModulesResponse, UserInfo } from './authenticated-context.model';
import { AuthenticatedContextStore } from './authenticated-context.store';

const userInfo: UserInfo = {
  firstName: 'Ana',
  lastName: 'Prueba',
  organization: { id: 'tenant-1', name: 'Secret Garden' },
  role: { id: 'role-1', code: 'TENANT_OWNER', name: 'Owner' },
};

const navigation: AvailableModulesResponse = {
  sections: [
    {
      code: 'operation',
      name: 'Operación',
      order: 1,
      isGrouped: false,
      modules: [{ id: 'module-orders', code: 'orders', name: 'Pedidos', order: 1 }],
      options: [],
    },
  ],
  emptyStateMessage: null,
};

class FakeContextRepository implements AuthenticatedContextRepository {
  readonly userInfo = vi.fn<() => Observable<UserInfo>>(() => of(userInfo));
  readonly availableModules = vi.fn<
    (language: SupportedLanguage) => Observable<AvailableModulesResponse>
  >(() => of(navigation));
}

describe('AuthenticatedContextStore', () => {
  let store: AuthenticatedContextStore;
  let repository: FakeContextRepository;
  let activeTenant: WritableSignal<ActiveTenant | null>;
  const language = signal<SupportedLanguage>('es');
  const clearTenant = vi.fn();

  beforeEach(() => {
    activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Secret Garden' });
    repository = new FakeContextRepository();
    clearTenant.mockClear();
    language.set('es');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthenticatedContextStore,
        { provide: AUTHENTICATED_CONTEXT_REPOSITORY, useValue: repository },
        {
          provide: LocalizationService,
          useValue: { language: language.asReadonly() },
        },
        {
          provide: TenantContext,
          useValue: { activeTenant: activeTenant.asReadonly(), clear: clearTenant },
        },
      ],
    });
    store = TestBed.inject(AuthenticatedContextStore);
  });

  it('starts user info and modules requests together and publishes only the combined result', async () => {
    const userRequest = new Subject<UserInfo>();
    const modulesRequest = new Subject<AvailableModulesResponse>();
    repository.userInfo.mockReturnValue(userRequest);
    repository.availableModules.mockReturnValue(modulesRequest);

    const result = firstValueFrom(store.load());

    expect(repository.userInfo).toHaveBeenCalledOnce();
    expect(repository.availableModules).toHaveBeenCalledWith('es');
    expect(store.loading()).toBe(true);

    userRequest.next(userInfo);
    userRequest.complete();
    expect(store.userInfo()).toBeNull();

    modulesRequest.next(navigation);
    modulesRequest.complete();

    await expect(result).resolves.toEqual({
      userInfo,
      sections: navigation.sections,
      emptyStateMessage: null,
    });
    expect(store.ready()).toBe(true);
    expect(store.displayName()).toBe('Ana Prueba');
  });

  it('does not request contextual resources before a tenant is selected', () => {
    activeTenant.set(null);
    store.load().subscribe();

    expect(repository.userInfo).not.toHaveBeenCalled();
    expect(repository.availableModules).not.toHaveBeenCalled();
    expect(store.status()).toBe('idle');
  });

  it('treats an empty sections response as a successful state', async () => {
    const emptyMessage = 'No tienes módulos disponibles. Habla con el administrador.';
    repository.availableModules.mockReturnValue(
      of({ sections: [], emptyStateMessage: emptyMessage }),
    );

    await firstValueFrom(store.load());

    expect(store.status()).toBe('success');
    expect(store.sections()).toEqual([]);
    expect(store.modules()).toEqual([]);
    expect(store.options()).toEqual([]);
    expect(store.emptyStateMessage()).toBe(emptyMessage);
    expect(store.error()).toBeNull();
  });

  it('exposes an error and supports retrying the complete bootstrap', async () => {
    repository.availableModules
      .mockReturnValueOnce(throwError(() => new ApiError('network', 0, 'Sin conexión')))
      .mockReturnValueOnce(of(navigation));

    await expect(firstValueFrom(store.load())).rejects.toThrow('Sin conexión');
    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Sin conexión');

    await firstValueFrom(store.load());
    expect(repository.userInfo).toHaveBeenCalledTimes(2);
    expect(repository.availableModules).toHaveBeenCalledTimes(2);
    expect(store.status()).toBe('success');
  });

  it('clears the tenant and redirects when the API requires contextual tokens', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    repository.availableModules.mockReturnValue(
      throwError(
        () =>
          new ApiError(
            'unauthorized',
            403,
            'Debes seleccionar una organización.',
            {},
            'TENANT_REQUIRED',
          ),
      ),
    );

    await expect(firstValueFrom(store.load())).rejects.toThrow();

    expect(clearTenant).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/select-tenant']);
    expect(store.sections()).toEqual([]);
    expect(store.modules()).toEqual([]);
    expect(store.options()).toEqual([]);
  });

  it('does not publish a completed response from the previously selected tenant', async () => {
    const oldUserRequest = new Subject<UserInfo>();
    const oldModulesRequest = new Subject<AvailableModulesResponse>();
    const newUserInfo: UserInfo = {
      ...userInfo,
      organization: { id: 'tenant-2', name: 'Savia Demo' },
    };
    const newNavigation: AvailableModulesResponse = {
      sections: [
        {
          code: 'operation',
          name: 'Operación',
          order: 1,
          isGrouped: false,
          modules: [{ id: 'module-reports', code: 'reports', name: 'Reportes', order: 1 }],
          options: [],
        },
      ],
      emptyStateMessage: null,
    };
    repository.userInfo.mockReturnValueOnce(oldUserRequest).mockReturnValueOnce(of(newUserInfo));
    repository.availableModules
      .mockReturnValueOnce(oldModulesRequest)
      .mockReturnValueOnce(of(newNavigation));

    const oldLoad = firstValueFrom(store.load());
    activeTenant.set({ id: 'tenant-2', name: 'Savia Demo' });
    store.clear();
    await firstValueFrom(store.load());

    oldUserRequest.next(userInfo);
    oldUserRequest.complete();
    oldModulesRequest.next(navigation);
    oldModulesRequest.complete();
    await oldLoad;

    expect(store.userInfo()).toEqual(newUserInfo);
    expect(store.sections()).toEqual(newNavigation.sections);
    expect(store.modules()).toEqual(newNavigation.sections[0].modules);
  });
});
