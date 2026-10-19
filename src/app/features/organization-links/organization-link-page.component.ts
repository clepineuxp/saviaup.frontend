import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClient } from '../../shared/api/api-client.service';
import { ApiError } from '../../shared/http/api-error';
import { AuthStore } from '../../core/auth/auth-store.service';
import { TenantStore } from '../tenant/data-access/tenant-store.service';
import { Tenant } from '../tenant/models/tenant.model';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';
import { SettingsRole } from '../settings/models/settings.model';
import { switchMap, throwError } from 'rxjs';

interface AccessLinkPreview {
  readonly code: string;
  readonly kind: 'JOINREQUEST' | 'INVITATION';
  readonly organizationName: string | null;
  readonly roleName: string | null;
  readonly requesterName: string | null;
  readonly expiresAt: string;
  readonly availableOrganizations: readonly Tenant[] | null;
}

@Component({
  selector: 'app-organization-link-page',
  imports: [RouterLink],
  styleUrl: './organization-link-page.component.scss',
  template: `
    <main class="organization-link-page">
      <div class="organization-link-page__glow organization-link-page__glow--one" aria-hidden="true"></div>
      <div class="organization-link-page__glow organization-link-page__glow--two" aria-hidden="true"></div>
      <header class="organization-link-brand">
        <span class="organization-link-brand__mark" aria-hidden="true">
          <img src="logo/Logo-96.png" alt="" />
        </span>
        <span>SAVIA UP</span>
      </header>
      @if (loading() && !preview()) {
        <section class="organization-link-card organization-link-card--loading" aria-live="polite">
          <span class="organization-link-spinner" aria-hidden="true"></span>
          <p>Validando enlace…</p>
        </section>
      }
      @if (error(); as message) {
        <section class="organization-link-card organization-link-card--error">
          <div class="organization-link-card__icon" aria-hidden="true">!</div>
          <p class="eyebrow">SAVIA UP</p>
          <h1>Invitación no disponible</h1>
          <p>{{ message }}</p>
          <a class="organization-link-button organization-link-button--secondary" routerLink="/login">Ir a iniciar sesión</a>
        </section>
      }
      @if (preview(); as link) {
        <section class="organization-link-card">
          <div class="organization-link-card__icon" aria-hidden="true">
            <img src="logo/Logo-96.png" alt="" />
          </div>
          <p class="eyebrow">SAVIA UP</p>
          @if (link.kind === 'INVITATION') {
            <p class="organization-link-card__kicker">Te han invitado a un equipo</p>
            <h1>Aceptar invitación a <span>{{ link.organizationName }}</span></h1>
            <p>Al aceptar, pertenecerás a esta organización con el rol <strong>{{ link.roleName }}</strong>.</p>
          } @else {
            <p class="organization-link-card__kicker">Solicitud de acceso</p>
            <h1>Invitación a una organización</h1>
            <p><strong>{{ link.requesterName }}</strong> quiere ser invitado a una organización.</p>
          }
          @if (!auth.isAuthenticated()) {
            <div class="organization-link-notice">Inicia sesión o crea tu cuenta para continuar con esta invitación.</div>
            <div class="organization-link-actions">
              <a class="organization-link-button organization-link-button--primary" [routerLink]="['/login']" [queryParams]="{ returnUrl: returnUrl }">Iniciar sesión</a>
              <a class="organization-link-button organization-link-button--secondary" [routerLink]="['/register']" [queryParams]="{ returnUrl: returnUrl }">Crear cuenta</a>
            </div>
          } @else if (link.kind === 'INVITATION') {
            <button class="organization-link-button organization-link-button--primary organization-link-button--full" type="button" (click)="accept()" [disabled]="loading()">
              {{ loading() ? 'Aceptando…' : 'Aceptar invitación' }}
            </button>
          } @else if (link.availableOrganizations?.length) {
            <div class="organization-link-form">
              <label>Organización
                <select [value]="selectedTenantId()" (change)="selectTenant($any($event.target).value)">
                <option value="">Selecciona una organización</option>
                @for (tenant of link.availableOrganizations; track tenant.id) { <option [value]="tenant.id">{{ tenant.name }}</option> }
                </select>
              </label>
              <label>Rol
                <select [value]="selectedRoleId()" (change)="selectedRoleId.set($any($event.target).value)">
                <option value="">Selecciona un rol</option>
                @for (role of roles(); track role.id) { @if (role.isActive) { <option [value]="role.id">{{ role.name }}</option> } }
                </select>
              </label>
              <button class="organization-link-button organization-link-button--primary organization-link-button--full" type="button" (click)="accept()" [disabled]="loading() || !selectedTenantId() || !selectedRoleId()">
                {{ loading() ? 'Aceptando…' : 'Aceptar solicitud' }}
              </button>
            </div>
          } @else {
            <div class="organization-link-notice">
              No puedes aceptar esta solicitud porque no tienes una organización con permisos para invitar usuarios. Intenta con otro usuario administrador.
            </div>
          }
          <small class="organization-link-expiry">Este enlace es válido durante 12 horas.</small>
        </section>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLinkPageComponent implements OnInit {
  readonly auth = inject(AuthStore);
  readonly tenantStore = inject(TenantStore);
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly preview = signal<AccessLinkPreview | null>(null);
  readonly roles = signal<readonly SettingsRole[]>([]);
  readonly selectedTenantId = signal('');
  readonly selectedRoleId = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly code = this.route.snapshot.paramMap.get('code') ?? '';
  readonly returnUrl = `/organization-links/${encodeURIComponent(this.code)}`;

  ngOnInit(): void {
    if (!this.code) return this.error.set('El enlace no es válido.');
    this.loading.set(true);
    this.api.get<AccessLinkPreview>(API_ENDPOINTS.organizationLinks.preview(this.code)).subscribe({
      next: (value) => {
        this.preview.set(value);
        this.loading.set(false);
        if (!this.auth.isAuthenticated()) localStorage.setItem('saviaup.pendingOrganizationLink', this.code);
      },
      error: (value: unknown) => {
        this.error.set(value instanceof ApiError ? value.message : 'Este enlace ya no está disponible.');
        this.loading.set(false);
      },
    });
  }

  selectTenant(id: string): void {
    this.selectedTenantId.set(id);
    this.selectedRoleId.set('');
    const tenant = this.preview()?.availableOrganizations?.find((item) => item.id === id);
    if (!tenant) return;
    this.loading.set(true);
    this.tenantStore.select(tenant).subscribe({
      next: () => this.api.get<readonly SettingsRole[]>(API_ENDPOINTS.settings.access.roles).subscribe({ next: (roles) => { this.roles.set(roles); this.loading.set(false); }, error: () => this.loading.set(false) }),
      error: () => this.loading.set(false),
    });
  }

  accept(): void {
    this.loading.set(true);
    this.api.post<{ tenantId: string }, { tenantId: string | null; roleId: string | null }>(API_ENDPOINTS.organizationLinks.accept(this.code), {
      tenantId: this.selectedTenantId() || null,
      roleId: this.selectedRoleId() || null,
    }).subscribe({
      next: (response) => {
        localStorage.removeItem('saviaup.pendingOrganizationLink');
        this.tenantStore.load().pipe(
          switchMap((tenants) => {
            const tenant = tenants.find((item) => item.id === response.tenantId);
            return tenant ? this.tenantStore.select(tenant) : throwError(() => new Error('Organización no encontrada'));
          }),
        ).subscribe({
          next: () => void this.router.navigate(['/app']),
          error: () => void this.router.navigate(['/select-tenant']),
        });
      },
      error: (value: unknown) => { this.error.set(value instanceof ApiError ? value.message : 'No pudimos completar la invitación.'); this.loading.set(false); },
    });
  }
}
