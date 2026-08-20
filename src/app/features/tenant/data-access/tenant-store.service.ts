import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, switchMap, tap, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import { Tenant } from '../models/tenant.model';
import { TENANT_REPOSITORY } from './tenant.repository';

@Injectable({ providedIn: 'root' })
export class TenantStore {
  private readonly repository = inject(TENANT_REPOSITORY);
  private readonly authStore = inject(AuthStore);
  private readonly authenticatedContext = inject(AuthenticatedContextStore);
  private readonly tenantContext = inject(TenantContext);
  private readonly tenantsState = signal<readonly Tenant[]>([]);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<string | null>(null);

  readonly tenants = this.tenantsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');

  load(): Observable<readonly Tenant[]> {
    return this.track(
      this.repository.list().pipe(tap((tenants) => this.tenantsState.set(tenants))),
    );
  }

  select(tenant: Tenant): Observable<void> {
    this.authenticatedContext.clear();
    return this.track(
      this.repository.select(tenant.id).pipe(
        tap((result) => {
          this.authStore.acceptContextualTokens(result.tokens);
          this.tenantContext.select({ id: result.tenant.id, name: result.tenant.name });
        }),
        switchMap(() => this.authenticatedContext.load()),
        map(() => undefined),
      ),
    );
  }

  create(name: string): Observable<Tenant> {
    this.authenticatedContext.clear();
    return this.track(
      this.repository.create(name).pipe(
        tap((result) => {
          this.authStore.acceptContextualTokens(result.tokens);
          this.tenantsState.update((tenants) => [...tenants, result.tenant]);
          this.tenantContext.select({ id: result.tenant.id, name: result.tenant.name });
        }),
        switchMap((result) => this.authenticatedContext.load().pipe(map(() => result.tenant))),
      ),
    );
  }

  private track<T>(request: Observable<T>): Observable<T> {
    this.statusState.set('loading');
    this.errorState.set(null);
    return request.pipe(
      tap(() => this.statusState.set('success')),
      catchError((error: unknown) => {
        this.errorState.set(
          error instanceof ApiError ? error.message : 'No pudimos completar la solicitud.',
        );
        this.statusState.set('error');
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.statusState() === 'loading') this.statusState.set('idle');
      }),
    );
  }
}
