import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { SettingsStore } from '../data-access/settings-store.service';
import {
  BusinessSettings,
  OrganizationUser,
  PaymentMethod,
  SaveSettingsRole,
  SETTINGS_PERMISSIONS,
  SettingsRole,
  SettingsTab,
} from '../models/settings.model';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  readonly store = inject(SettingsStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly localization = inject(LocalizationService);
  readonly activeTab = signal<SettingsTab>('organization');
  readonly editingPaymentId = signal<string | null>(null);
  readonly selectedRoleId = signal<string | null>(null);
  readonly editingRoleId = signal<string | null>(null);
  readonly selectedPermissions = signal<ReadonlySet<string>>(new Set());
  readonly logoUrl = signal<string | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly isSystemRoleSelected = computed(() => {
    const id = this.selectedRoleId();
    if (!id) return false;
    return this.store.roles().find((r) => r.id === id)?.isSystem ?? false;
  });
  readonly tabs = computed(() =>
    [
      this.store.hasPermission(SETTINGS_PERMISSIONS.organizationRead)
        ? ('organization' as const)
        : null,
      this.store.hasPermission(SETTINGS_PERMISSIONS.businessRead) ? ('business' as const) : null,
      this.store.hasPermission(SETTINGS_PERMISSIONS.paymentsRead) ? ('payments' as const) : null,
      this.store.hasPermission(SETTINGS_PERMISSIONS.usersRead) ? ('users' as const) : null,
      this.store.hasPermission(SETTINGS_PERMISSIONS.rolesRead) ? ('roles' as const) : null,
    ].filter((value): value is SettingsTab => value !== null),
  );

  readonly organizationForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    responsibleName: ['', Validators.maxLength(160)],
    document: ['', Validators.maxLength(80)],
    contactName: ['', Validators.maxLength(160)],
    email: ['', [Validators.email, Validators.maxLength(320)]],
    address: ['', Validators.maxLength(500)],
    country: ['', Validators.maxLength(100)],
    state: ['', Validators.maxLength(120)],
    city: ['', Validators.maxLength(120)],
    phone: ['', Validators.maxLength(50)],
    website: ['', Validators.maxLength(2048)],
  });
  readonly businessForm = this.fb.nonNullable.group({
    usesTables: [true],
    deliveryEnabled: [false],
    requiresOpenCashRegister: [false],
    showVoluntaryTip: [true],
    tipMessage: ['Servicio Voluntario', [Validators.required, Validators.maxLength(200)]],
    suggestedTipPercentage: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
  });
  readonly paymentForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    isIncludedInCashOpening: [false],
  });
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    roleId: ['', Validators.required],
  });
  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
  });

  readonly hasCashRegistersPermission = computed(
    () =>
      this.store.hasPermission('cash-registers.manage') ||
      this.store.hasPermission('cash-registers.read') ||
      this.store.hasPermission('cash-registers.operate'),
  );

  ngOnInit(): void {
    this.store
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const organization = this.store.organization();
          if (organization)
            this.organizationForm.patchValue({
              name: organization.name,
              responsibleName: organization.responsibleName ?? '',
              document: organization.document ?? '',
              contactName: organization.contactName ?? '',
              email: organization.email ?? '',
              address: organization.address ?? '',
              country: organization.country ?? '',
              state: organization.state ?? '',
              city: organization.city ?? '',
              phone: organization.phone ?? '',
              website: organization.website ?? '',
            });
          const business = this.store.business();
          if (business) {
            this.businessForm.patchValue({
              ...business,
              requiresOpenCashRegister:
                this.hasCashRegistersPermission() && business.requiresOpenCashRegister,
            });
          }
          const first = this.tabs()[0];
          if (first) this.activeTab.set(first);
          if (organization?.hasLogo) this.refreshLogo();
        },
        error: () => undefined,
      });
  }

  ngOnDestroy(): void {
    this.revokeLogo();
  }
  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.successKey.set(null);
    this.store.clearError();
  }

  saveOrganization(): void {
    if (
      this.organizationForm.invalid ||
      !this.store.hasPermission(SETTINGS_PERMISSIONS.organizationManage)
    )
      return this.organizationForm.markAllAsTouched();
    const value = this.organizationForm.getRawValue();
    this.store
      .updateOrganization({
        ...value,
        responsibleName: this.nullable(value.responsibleName),
        document: this.nullable(value.document),
        contactName: this.nullable(value.contactName),
        email: this.nullable(value.email),
        address: this.nullable(value.address),
        country: this.nullable(value.country),
        state: this.nullable(value.state),
        city: this.nullable(value.city),
        phone: this.nullable(value.phone),
        website: this.nullable(value.website),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.successKey.set('settings.success.saved'),
        error: () => undefined,
      });
  }

  chooseLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.store
      .uploadLogo(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successKey.set('settings.success.logo');
          this.refreshLogo();
        },
        error: () => undefined,
      });
  }
  deleteLogo(): void {
    if (!confirm(this.localization.translate('settings.confirm.logo'))) return;
    this.store
      .deleteLogo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.revokeLogo();
          this.logoUrl.set(null);
        },
        error: () => undefined,
      });
  }

  saveBusiness(): void {
    if (this.businessForm.invalid || !this.store.hasPermission(SETTINGS_PERMISSIONS.businessManage))
      return this.businessForm.markAllAsTouched();
    this.store
      .updateBusiness(this.businessForm.getRawValue() as BusinessSettings)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.successKey.set('settings.success.saved'),
        error: () => undefined,
      });
  }

  editPayment(item: PaymentMethod): void {
    this.editingPaymentId.set(item.id);
    this.paymentForm.setValue({
      name: item.name,
      isIncludedInCashOpening: item.isIncludedInCashOpening,
    });
  }
  cancelPayment(): void {
    this.editingPaymentId.set(null);
    this.paymentForm.reset({ name: '', isIncludedInCashOpening: false });
  }
  savePayment(): void {
    if (this.paymentForm.invalid) return this.paymentForm.markAllAsTouched();
    this.store
      .savePayment(this.editingPaymentId(), this.paymentForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelPayment();
          this.successKey.set('settings.success.saved');
        },
        error: () => undefined,
      });
  }
  togglePayment(item: PaymentMethod): void {
    this.store
      .togglePayment(item)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
  deletePayment(item: PaymentMethod): void {
    if (!confirm(this.localization.translate('settings.confirm.payment', { name: item.name })))
      return;
    this.store
      .deletePayment(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  selectRole(role: SettingsRole): void {
    this.selectedRoleId.set(role.id);
    this.editingRoleId.set(role.id);
    this.roleForm.setValue({ name: role.name, description: role.description ?? '' });
    this.selectedPermissions.set(new Set(role.permissions));
  }
  startNewRole(): void {
    this.selectedRoleId.set(null);
    this.editingRoleId.set(null);
    this.roleForm.reset({ name: '', description: '' });
    this.selectedPermissions.set(new Set());
  }
  editRole(role: SettingsRole): void {
    this.selectRole(role);
  }
  cancelRole(): void {
    this.startNewRole();
  }
  permissionChanged(code: string, checked: boolean): void {
    if (this.isSystemRoleSelected()) return;
    this.selectedPermissions.update((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }
  saveRole(): void {
    if (this.isSystemRoleSelected()) return;
    if (this.roleForm.invalid) return this.roleForm.markAllAsTouched();
    const value = this.roleForm.getRawValue();
    const request: SaveSettingsRole = {
      name: value.name,
      description: this.nullable(value.description),
      permissions: [...this.selectedPermissions()],
    };
    this.store
      .saveRole(this.editingRoleId(), request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (savedRole) => {
          this.selectRole(savedRole);
          this.successKey.set('settings.success.saved');
        },
        error: () => undefined,
      });
  }
  toggleRole(role: SettingsRole, event?: Event): void {
    event?.stopPropagation();
    if (role.isSystem) return;
    this.store
      .toggleRole(role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
  deleteRole(role: SettingsRole, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(this.localization.translate('settings.confirm.role', { name: role.name }))) return;
    this.store
      .deleteRole(role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.selectedRoleId() === role.id) {
            this.startNewRole();
          }
        },
        error: () => undefined,
      });
  }

  inviteUser(): void {
    if (this.inviteForm.invalid) return this.inviteForm.markAllAsTouched();
    const value = this.inviteForm.getRawValue();
    this.store
      .inviteUser(value.email, value.roleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inviteForm.reset({ email: '', roleId: '' });
          this.successKey.set('settings.success.invited');
        },
        error: () => undefined,
      });
  }
  updateUserRole(user: OrganizationUser, roleId: string): void {
    if (!user.membershipId) return;
    this.store
      .updateUser(user.membershipId, {
        roleId,
        isActive: user.status === 'ACTIVE',
        disabledUntil: user.disabledUntil,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
  toggleUser(user: OrganizationUser, disabledUntil: string): void {
    if (!user.membershipId) return;
    const enabling = user.status !== 'ACTIVE';
    this.store
      .updateUser(user.membershipId, {
        roleId: user.roleId,
        isActive: enabling,
        disabledUntil:
          enabling || !disabledUntil ? null : new Date(`${disabledUntil}T23:59:59`).toISOString(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
  deleteUser(user: OrganizationUser): void {
    if (!confirm(this.localization.translate('settings.confirm.user', { email: user.email })))
      return;
    this.store
      .deleteUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  private refreshLogo(): void {
    this.store
      .getLogo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.revokeLogo();
          this.logoUrl.set(URL.createObjectURL(blob));
        },
        error: () => this.logoUrl.set(null),
      });
  }
  private revokeLogo(): void {
    const url = this.logoUrl();
    if (url) URL.revokeObjectURL(url);
  }
  private nullable(value: string): string | null {
    const clean = value.trim();
    return clean || null;
  }
}
