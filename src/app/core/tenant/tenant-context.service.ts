import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export interface ActiveTenant {
  readonly id: string;
  readonly name: string;
}

const TENANT_KEY = 'saviaup.active-tenant';

@Injectable({ providedIn: 'root' })
export class TenantContext {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly activeTenantState = signal<ActiveTenant | null>(this.load());

  readonly activeTenant = this.activeTenantState.asReadonly();

  select(tenant: ActiveTenant): void {
    this.activeTenantState.set(tenant);
    if (this.isBrowser) localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
  }

  clear(): void {
    this.activeTenantState.set(null);
    if (this.isBrowser) localStorage.removeItem(TENANT_KEY);
  }

  private load(): ActiveTenant | null {
    if (!this.isBrowser) return null;
    const serialized = localStorage.getItem(TENANT_KEY);
    if (!serialized) return null;
    try {
      const tenant = JSON.parse(serialized) as ActiveTenant;
      return tenant.id && tenant.name ? tenant : null;
    } catch {
      localStorage.removeItem(TENANT_KEY);
      return null;
    }
  }
}
