import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import {
  DEFAULT_PRINTING_TEMPLATES,
  SETTINGS_PERMISSIONS,
  SettingsRole,
} from '../models/settings.model';
import { SETTINGS_REPOSITORY } from './settings.repository';
import { SettingsStore } from './settings-store.service';

describe('SettingsStore', () => {
  let store: SettingsStore;
  const repositoryMock = {
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    getLogo: vi.fn(),
    uploadLogo: vi.fn(),
    deleteLogo: vi.fn(),
    getBusiness: vi.fn(),
    updateBusiness: vi.fn(),
    getPrintingTemplates: vi.fn(),
    updatePrintingTemplates: vi.fn(),
    listPrintingPrinters: vi.fn(),
    testKitchenPrint: vi.fn(),
    updateExpenseEditingPolicy: vi.fn(),
    listPaymentMethods: vi.fn(),
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
    setPaymentMethodStatus: vi.fn(),
    deletePaymentMethod: vi.fn(),
    listPermissions: vi.fn(),
    listRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    setRoleStatus: vi.fn(),
    deleteRole: vi.fn(),
    listUsers: vi.fn(),
    inviteUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  };

  const authStoreMock = {
    loadCurrentUser: vi.fn(),
  };

  const tenantContextMock = {
    activeTenant: vi.fn(),
    select: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: SETTINGS_REPOSITORY, useValue: repositoryMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: TenantContext, useValue: tenantContextMock },
      ],
    });
    store = TestBed.inject(SettingsStore);
  });

  it('loads roles and permissions and updates role status correctly', async () => {
    const permissions = [SETTINGS_PERMISSIONS.rolesRead, SETTINGS_PERMISSIONS.rolesManage];
    authStoreMock.loadCurrentUser.mockReturnValue(
      of({ id: 'u1', email: 'admin@saviaup.local', permissions }),
    );
    const role: SettingsRole = {
      id: 'r1',
      code: 'MANAGER',
      name: 'Manager',
      description: 'Gestor',
      isSystem: false,
      isActive: true,
      permissions: ['tables.read'],
    };
    repositoryMock.listRoles.mockReturnValue(of([role]));
    repositoryMock.listPermissions.mockReturnValue(of([]));
    repositoryMock.setRoleStatus.mockReturnValue(of({ ...role, isActive: false }));

    await firstValueFrom(store.load());
    expect(store.roles().length).toBe(1);
    expect(store.roles()[0]?.isActive).toBe(true);

    await firstValueFrom(store.toggleRole(role));
    expect(store.roles()[0]?.isActive).toBe(false);
  });

  it('loads and updates tenant printing templates for business settings users', async () => {
    authStoreMock.loadCurrentUser.mockReturnValue(
      of({
        id: 'u1',
        email: 'admin@saviaup.local',
        permissions: [SETTINGS_PERMISSIONS.businessRead, SETTINGS_PERMISSIONS.businessManage],
      }),
    );
    repositoryMock.getBusiness.mockReturnValue(of(null));
    repositoryMock.getPrintingTemplates.mockReturnValue(of(DEFAULT_PRINTING_TEMPLATES));
    repositoryMock.listPrintingPrinters.mockReturnValue(of([]));
    repositoryMock.updatePrintingTemplates.mockReturnValue(
      of({
        ...DEFAULT_PRINTING_TEMPLATES,
        receipt: { ...DEFAULT_PRINTING_TEMPLATES.receipt, itemFontSize: 15 },
      }),
    );

    await firstValueFrom(store.load());
    expect(store.printingTemplates()?.receipt.itemFontSize).toBe(11);

    await firstValueFrom(
      store.updatePrintingTemplates({
        ...DEFAULT_PRINTING_TEMPLATES,
        receipt: { ...DEFAULT_PRINTING_TEMPLATES.receipt, itemFontSize: 15 },
      }),
    );
    expect(store.printingTemplates()?.receipt.itemFontSize).toBe(15);
  });
});
