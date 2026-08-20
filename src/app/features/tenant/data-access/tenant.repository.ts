import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { SessionTokens } from '../../../core/auth/session.model';

export interface TenantSessionResult {
  readonly tenant: Tenant;
  readonly tokens: SessionTokens;
}

export interface TenantRepository {
  list(): Observable<readonly Tenant[]>;
  create(name: string): Observable<TenantSessionResult>;
  select(tenantId: string): Observable<TenantSessionResult>;
}

export const TENANT_REPOSITORY = new InjectionToken<TenantRepository>('TENANT_REPOSITORY');
