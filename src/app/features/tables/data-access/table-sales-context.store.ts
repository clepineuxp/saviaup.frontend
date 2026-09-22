import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, shareReplay, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiClient } from '../../../shared/api/api-client.service';
export interface TableSalesBusiness {
  readonly enableCustomSales: boolean;
  readonly showVoluntaryTip: boolean;
  readonly suggestedTipPercentage: number;
}

export interface TableSalesPaymentMethod {
  readonly id: string;
  readonly name: string;
}

export interface TableSalesContext {
  readonly organization: {
    readonly name: string;
    readonly hasLogo: boolean;
    readonly logoVersion: number;
  };
  readonly business: TableSalesBusiness;
  readonly paymentMethods: readonly TableSalesPaymentMethod[];
  readonly capabilities: {
    readonly canRead: boolean;
    readonly canOperate: boolean;
    readonly canManage: boolean;
  };
}

/** Safe, tenant-scoped settings required only while operating tables. */
@Injectable({ providedIn: 'root' })
export class TableSalesContextStore {
  private readonly api = inject(ApiClient);
  private readonly tenant = inject(TenantContext);
  private readonly requests = new Map<string, Observable<TableSalesContext>>();
  private readonly contextState = signal<TableSalesContext | null>(null);

  readonly context = this.contextState.asReadonly();
  readonly organization = () => this.contextState()?.organization ?? null;
  readonly business = () => this.contextState()?.business ?? null;
  readonly paymentMethods = () => this.contextState()?.paymentMethods ?? [];

  ensureLoaded(): Observable<TableSalesContext> {
    const tenantId = this.tenant.activeTenant()?.id;
    if (!tenantId) throw new Error('A tenant is required to load the table sales context.');
    const pending = this.requests.get(tenantId);
    if (pending) return pending;
    const request = this.api.get<TableSalesContext>(API_ENDPOINTS.tables.salesContext).pipe(
      tap((context) => {
        if (this.tenant.activeTenant()?.id === tenantId) this.contextState.set(context);
      }),
      finalize(() => this.requests.delete(tenantId)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.requests.set(tenantId, request);
    return request;
  }

  getLogo(): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINTS.tables.salesLogo);
  }
}
