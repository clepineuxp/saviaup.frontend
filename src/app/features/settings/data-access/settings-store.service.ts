import { computed, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import {
  BusinessSettings,
  EnabledModulePermissions,
  OrganizationSettings,
  OrganizationUser,
  PaymentMethod,
  SavePaymentMethod,
  SaveSettingsRole,
  SETTINGS_PERMISSIONS,
  SettingsRole,
  UpdateOrganizationSettings,
  UpdateOrganizationUser,
} from '../models/settings.model';
import { SETTINGS_REPOSITORY } from './settings.repository';

@Injectable()
export class SettingsStore {
  private readonly repository = inject(SETTINGS_REPOSITORY);
  private readonly auth = inject(AuthStore);
  private readonly tenant = inject(TenantContext);
  private readonly organizationState = signal<OrganizationSettings | null>(null);
  private readonly businessState = signal<BusinessSettings | null>(null);
  private readonly paymentMethodsState = signal<readonly PaymentMethod[]>([]);
  private readonly rolesState = signal<readonly SettingsRole[]>([]);
  private readonly usersState = signal<readonly OrganizationUser[]>([]);
  private readonly permissionCatalogState = signal<readonly EnabledModulePermissions[]>([]);
  private readonly userPermissionsState = signal<ReadonlySet<string>>(new Set());
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<string | null>(null);

  readonly organization = this.organizationState.asReadonly();
  readonly business = this.businessState.asReadonly();
  readonly paymentMethods = this.paymentMethodsState.asReadonly();
  readonly roles = this.rolesState.asReadonly();
  readonly users = this.usersState.asReadonly();
  readonly permissionCatalog = this.permissionCatalogState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');

  hasPermission(permission: string): boolean {
    return this.userPermissionsState().has(permission);
  }

  load(): Observable<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    return this.auth.loadCurrentUser().pipe(
      switchMap((user) => {
        this.userPermissionsState.set(new Set(user.permissions));
        const can = (permission: string) => user.permissions.includes(permission);
        const canOperateOrRead = can('orders.create') || can('tables.operate') || can('orders.read') || can('tables.read');
        return forkJoin({
          organization: (can(SETTINGS_PERMISSIONS.organizationRead) || canOperateOrRead)
            ? this.repository.getOrganization()
            : of(null),
          business: (can(SETTINGS_PERMISSIONS.businessRead) || canOperateOrRead)
            ? this.repository.getBusiness()
            : of(null),
          payments: (can(SETTINGS_PERMISSIONS.paymentsRead) || canOperateOrRead)
            ? this.repository.listPaymentMethods()
            : of([]),
          roles: can(SETTINGS_PERMISSIONS.rolesRead) ? this.repository.listRoles() : of([]),
          catalog: can(SETTINGS_PERMISSIONS.rolesRead) ? this.repository.listPermissions() : of([]),
          users: can(SETTINGS_PERMISSIONS.usersRead) ? this.repository.listUsers() : of([]),
        });
      }),
      tap((data) => {
        this.organizationState.set(data.organization);
        this.businessState.set(data.business);
        this.paymentMethodsState.set(data.payments);
        this.rolesState.set(data.roles);
        this.permissionCatalogState.set(data.catalog);
        this.usersState.set(data.users);
        this.statusState.set('success');
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        this.errorState.set(this.message(error));
        this.statusState.set('error');
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.statusState() === 'loading') this.statusState.set('idle');
      }),
    );
  }

  getLogo(): Observable<Blob> {
    return this.repository.getLogo();
  }
  updateOrganization(request: UpdateOrganizationSettings): Observable<OrganizationSettings> {
    return this.mutate(this.repository.updateOrganization(request)).pipe(
      tap((value) => {
        this.organizationState.set(value);
        const active = this.tenant.activeTenant();
        if (active) this.tenant.select({ ...active, name: value.name });
      }),
    );
  }
  uploadLogo(file: File): Observable<void> {
    return this.mutate(this.repository.uploadLogo(file)).pipe(
      tap(() =>
        this.organizationState.update((value) =>
          value ? { ...value, hasLogo: true, logoVersion: Date.now() } : value,
        ),
      ),
    );
  }
  deleteLogo(): Observable<void> {
    return this.mutate(this.repository.deleteLogo()).pipe(
      tap(() =>
        this.organizationState.update((value) =>
          value ? { ...value, hasLogo: false, logoVersion: Date.now() } : value,
        ),
      ),
    );
  }
  updateBusiness(request: BusinessSettings): Observable<BusinessSettings> {
    return this.mutate(this.repository.updateBusiness(request)).pipe(
      tap((value) => this.businessState.set(value)),
    );
  }
  savePayment(id: string | null, request: SavePaymentMethod): Observable<PaymentMethod> {
    const operation = id
      ? this.repository.updatePaymentMethod(id, request)
      : this.repository.createPaymentMethod(request);
    return this.mutate(operation).pipe(tap((value) => this.upsertPayment(value)));
  }
  togglePayment(item: PaymentMethod): Observable<PaymentMethod> {
    return this.mutate(this.repository.setPaymentMethodStatus(item.id, !item.isActive)).pipe(
      tap((value) => this.upsertPayment(value)),
    );
  }
  deletePayment(id: string): Observable<void> {
    return this.mutate(this.repository.deletePaymentMethod(id)).pipe(
      tap(() => this.paymentMethodsState.update((items) => items.filter((item) => item.id !== id))),
    );
  }
  saveRole(id: string | null, request: SaveSettingsRole): Observable<SettingsRole> {
    const operation = id
      ? this.repository.updateRole(id, request)
      : this.repository.createRole(request);
    return this.mutate(operation).pipe(tap((value) => this.upsertRole(value)));
  }
  toggleRole(item: SettingsRole): Observable<SettingsRole> {
    return this.mutate(this.repository.setRoleStatus(item.id, !item.isActive)).pipe(
      tap((value) => this.upsertRole(value)),
    );
  }
  deleteRole(id: string): Observable<void> {
    return this.mutate(this.repository.deleteRole(id)).pipe(
      tap(() => this.rolesState.update((items) => items.filter((item) => item.id !== id))),
    );
  }
  inviteUser(email: string, roleId: string): Observable<OrganizationUser> {
    return this.mutate(this.repository.inviteUser(email, roleId)).pipe(
      tap((value) => this.upsertUser(value)),
    );
  }
  updateUser(id: string, request: UpdateOrganizationUser): Observable<OrganizationUser> {
    return this.mutate(this.repository.updateUser(id, request)).pipe(
      tap((value) => this.upsertUser(value)),
    );
  }
  deleteUser(id: string): Observable<void> {
    return this.mutate(this.repository.deleteUser(id)).pipe(
      tap(() => this.usersState.update((items) => items.filter((item) => item.id !== id))),
    );
  }
  clearError(): void {
    this.errorState.set(null);
  }

  private mutate<T>(request: Observable<T>): Observable<T> {
    this.mutationStatusState.set('loading');
    this.errorState.set(null);
    return request.pipe(
      catchError((error: unknown) => {
        this.errorState.set(this.message(error));
        this.mutationStatusState.set('error');
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.mutationStatusState() === 'loading') this.mutationStatusState.set('success');
      }),
    );
  }
  private upsertPayment(value: PaymentMethod): void {
    this.paymentMethodsState.update((items) =>
      [...items.filter((item) => item.id !== value.id), value].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }
  private upsertRole(value: SettingsRole): void {
    this.rolesState.update((items) =>
      [...items.filter((item) => item.id !== value.id), value].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }
  private upsertUser(value: OrganizationUser): void {
    this.usersState.update((items) =>
      [...items.filter((item) => item.id !== value.id), value].sort((a, b) =>
        a.email.localeCompare(b.email),
      ),
    );
  }
  private message(error: unknown): string {
    return error instanceof ApiError ? error.message : 'No pudimos completar la solicitud.';
  }
}
