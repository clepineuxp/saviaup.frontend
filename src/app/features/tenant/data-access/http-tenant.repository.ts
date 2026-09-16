import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CreateTenantRequest,
  Tenant,
  TenantDto,
  TenantSessionResponseDto,
} from '../models/tenant.model';
import { TenantRepository, TenantSessionResult } from './tenant.repository';

const mapTenant = (tenant: TenantDto): Tenant => ({ ...tenant });

@Injectable()
export class HttpTenantRepository implements TenantRepository {
  private readonly api = inject(ApiClient);

  list(): Observable<readonly Tenant[]> {
    return this.api
      .get<readonly TenantDto[]>(API_ENDPOINTS.tenants.root)
      .pipe(map((tenants) => tenants.map(mapTenant)));
  }

  create(name: string): Observable<TenantSessionResult> {
    return this.api
      .post<TenantSessionResponseDto, CreateTenantRequest>(API_ENDPOINTS.tenants.root, { name })
      .pipe(map((response) => ({ tenant: mapTenant(response.tenant), tokens: response.tokens })));
  }

  select(tenantId: string): Observable<TenantSessionResult> {
    return this.api
      .post<TenantSessionResponseDto, Record<string, never>>(
        API_ENDPOINTS.tenants.select(tenantId),
        {},
      )
      .pipe(map((response) => ({ tenant: mapTenant(response.tenant), tokens: response.tokens })));
  }
}
