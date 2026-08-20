import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { TenantRepository } from './tenant.repository';
import { TenantSessionResult } from './tenant.repository';

@Injectable()
export class MockTenantRepository implements TenantRepository {
  private readonly tenants: Tenant[] = [
    {
      id: 'tenant-secret-garden',
      name: 'Secret Garden',
      roleId: 'role-owner',
      roleName: 'Administrador',
    },
    { id: 'tenant-savia-demo', name: 'Savia Demo', roleId: 'role-cashier', roleName: 'Cajero' },
  ];

  list(): Observable<readonly Tenant[]> {
    return of([...this.tenants]).pipe(delay(600));
  }

  create(name: string): Observable<TenantSessionResult> {
    const tenant: Tenant = {
      id: crypto.randomUUID(),
      name,
      roleId: crypto.randomUUID(),
      roleName: 'Propietario',
    };
    this.tenants.push(tenant);
    return of({ tenant, tokens: this.tokens() }).pipe(delay(700));
  }

  select(tenantId: string): Observable<TenantSessionResult> {
    const tenant = this.tenants.find((value) => value.id === tenantId) ?? this.tenants[0];
    return of({ tenant, tokens: this.tokens() }).pipe(delay(450));
  }

  private tokens() {
    return {
      accessToken: `mock-access-${crypto.randomUUID()}`,
      refreshToken: `mock-refresh-${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
}
