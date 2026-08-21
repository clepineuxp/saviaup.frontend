export type SettingsTab = 'organization' | 'business' | 'payments' | 'users' | 'roles';

export interface OrganizationSettings {
  readonly id: string;
  readonly name: string;
  readonly responsibleName: string | null;
  readonly document: string | null;
  readonly contactName: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly country: string | null;
  readonly state: string | null;
  readonly city: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly hasLogo: boolean;
  readonly logoVersion: number;
  readonly canEditDocument: boolean;
}

export type UpdateOrganizationSettings = Omit<
  OrganizationSettings,
  'id' | 'hasLogo' | 'logoVersion' | 'canEditDocument'
>;

export interface BusinessSettings {
  readonly usesTables: boolean;
  readonly deliveryEnabled: boolean;
  readonly requiresOpenCashRegister: boolean;
  readonly enableCustomSales: boolean;
  readonly showVoluntaryTip: boolean;
  readonly tipMessage: string;
  readonly suggestedTipPercentage: number;
}

export interface PaymentMethod {
  readonly id: string;
  readonly name: string;
  readonly isIncludedInCashOpening: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavePaymentMethod {
  readonly name: string;
  readonly isIncludedInCashOpening: boolean;
}

export interface EnabledPermission {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}
export interface EnabledModulePermissions {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly permissions: readonly EnabledPermission[];
}

export interface SettingsRole {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly permissions: readonly string[];
}

export interface SaveSettingsRole {
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
}

export type OrganizationUserStatus = 'ACTIVE' | 'DISABLED' | 'PENDING';
export interface OrganizationUser {
  readonly id: string;
  readonly membershipId: string | null;
  readonly invitationId: string | null;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly roleId: string;
  readonly roleName: string;
  readonly status: OrganizationUserStatus;
  readonly disabledUntil: string | null;
  readonly createdAt: string;
}

export interface UpdateOrganizationUser {
  readonly roleId: string;
  readonly isActive: boolean;
  readonly disabledUntil: string | null;
}

export const SETTINGS_PERMISSIONS = {
  organizationRead: 'settings.organization.read',
  organizationManage: 'settings.organization.manage',
  businessRead: 'settings.business.read',
  businessManage: 'settings.business.manage',
  paymentsRead: 'settings.payment-methods.read',
  paymentsManage: 'settings.payment-methods.manage',
  usersRead: 'settings.users.read',
  usersManage: 'settings.users.manage',
  rolesRead: 'settings.roles.read',
  rolesManage: 'settings.roles.manage',
} as const;
