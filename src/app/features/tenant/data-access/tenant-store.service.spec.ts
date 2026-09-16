import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { AuthenticatedContext } from '../../../core/context/authenticated-context.model';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { SessionTokens } from '../../../core/auth/session.model';
import { Tenant } from '../models/tenant.model';
import { TENANT_REPOSITORY, TenantRepository, TenantSessionResult } from './tenant.repository';
import { TenantStore } from './tenant-store.service';

const tokens: SessionTokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const tenant: Tenant = {
  id: 'tenant-1',
  name: 'Secret Garden',
  roleId: 'role-1',
  roleName: 'Owner',
};

const loadedContext: AuthenticatedContext = {
  userInfo: {
    firstName: 'Ana',
    lastName: 'Prueba',
    organization: { id: tenant.id, name: tenant.name },
    role: { id: tenant.roleId, code: 'TENANT_OWNER', name: tenant.roleName },
  },
  sections: [],
  emptyStateMessage: 'Sin módulos',
};

class FakeTenantRepository implements TenantRepository {
  list(): Observable<readonly Tenant[]> {
    return of([tenant]);
  }

  create(name: string): Observable<TenantSessionResult> {
    return of({ tenant: { ...tenant, name }, tokens });
  }

  select(tenantId: string): Observable<TenantSessionResult> {
    return of({ tenant: { ...tenant, id: tenantId }, tokens });
  }
}

describe('TenantStore contextual bootstrap', () => {
  let store: TenantStore;
  const events: string[] = [];
  const clear = vi.fn(() => events.push('clear-context'));
  const load = vi.fn(() => {
    events.push('load-context');
    return of(loadedContext);
  });
  const acceptTokens = vi.fn(() => events.push('persist-tokens'));
  const selectTenant = vi.fn(() => events.push('select-tenant'));

  beforeEach(() => {
    events.length = 0;
    clear.mockClear();
    load.mockClear();
    acceptTokens.mockClear();
    selectTenant.mockClear();
    TestBed.configureTestingModule({
      providers: [
        TenantStore,
        { provide: TENANT_REPOSITORY, useClass: FakeTenantRepository },
        { provide: AuthStore, useValue: { acceptContextualTokens: acceptTokens } },
        { provide: AuthenticatedContextStore, useValue: { clear, load } },
        { provide: TenantContext, useValue: { select: selectTenant } },
      ],
    });
    store = TestBed.inject(TenantStore);
  });

  it('persists contextual tokens before reloading user info and modules', async () => {
    await firstValueFrom(store.select(tenant));

    expect(events).toEqual(['clear-context', 'persist-tokens', 'select-tenant', 'load-context']);
  });

  it('reloads the complete context every time the organization changes', async () => {
    await firstValueFrom(store.select(tenant));
    await firstValueFrom(store.select({ ...tenant, id: 'tenant-2', name: 'Savia Demo' }));

    expect(clear).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('also completes the contextual bootstrap when an organization is created', async () => {
    await firstValueFrom(store.create('Nueva sede'));

    expect(events).toEqual(['clear-context', 'persist-tokens', 'select-tenant', 'load-context']);
  });
});
