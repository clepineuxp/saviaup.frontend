export type SettingsTab = 'organization' | 'business' | 'printing' | 'payments' | 'users' | 'roles';

export type PrintAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
export type VoluntaryTipPosition = 'BEFORE_TOTAL' | 'AFTER_TOTAL';
export type KitchenPrintLayout = 'COMPACT' | 'STANDARD' | 'SPACIOUS';

export interface ReceiptPrintTemplate {
  readonly paperWidthMm: 58 | 80;
  readonly baseFontSize: number;
  readonly headerFontSize: number;
  readonly itemFontSize: number;
  readonly totalFontSize: number;
  readonly voluntaryTipFontSize: number;
  readonly voluntaryTipAlignment: PrintAlignment;
  readonly voluntaryTipPosition: VoluntaryTipPosition;
  readonly wrapLongItemNames: boolean;
  readonly showLogo: boolean;
  readonly logoWidthMm: number;
}

export interface KitchenPrintTemplate {
  readonly headerFontScale: 1 | 2;
  readonly metadataFontScale: 1 | 2;
  readonly itemFontScale: 1 | 2;
  readonly notesFontScale: 1 | 2;
  readonly headerAlignment: PrintAlignment;
  readonly layout: KitchenPrintLayout;
  readonly wrapLongItemNames: boolean;
  readonly maxItemNameLines: 1 | 2 | 3;
  readonly showTable: boolean;
  readonly showWaiter: boolean;
  readonly showTimestamp: boolean;
  readonly uppercaseItemNames: boolean;
}

export interface PrintingTemplateSettings {
  readonly receipt: ReceiptPrintTemplate;
  readonly kitchen: KitchenPrintTemplate;
}

export interface PrintingPrinter {
  readonly id: string;
  readonly printAgentId: string;
  readonly name: string;
  readonly paperWidth: number;
  readonly enabled: boolean;
}

export const DEFAULT_PRINTING_TEMPLATES: PrintingTemplateSettings = {
  receipt: {
    paperWidthMm: 80,
    baseFontSize: 11,
    headerFontSize: 13,
    itemFontSize: 11,
    totalFontSize: 13,
    voluntaryTipFontSize: 11,
    voluntaryTipAlignment: 'LEFT',
    voluntaryTipPosition: 'BEFORE_TOTAL',
    wrapLongItemNames: true,
    showLogo: true,
    logoWidthMm: 48,
  },
  kitchen: {
    headerFontScale: 2,
    metadataFontScale: 1,
    itemFontScale: 1,
    notesFontScale: 1,
    headerAlignment: 'CENTER',
    layout: 'STANDARD',
    wrapLongItemNames: true,
    maxItemNameLines: 2,
    showTable: true,
    showWaiter: true,
    showTimestamp: true,
    uppercaseItemNames: false,
  },
};

export interface OrganizationSettings {
  readonly timeZoneId?: string;
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
  readonly enableOrderPrintZones: boolean;
  readonly lockExpenseFinancialFieldsAfterCreation: boolean;
}

export type UpdateBusinessSettings = Omit<
  BusinessSettings,
  'lockExpenseFinancialFieldsAfterCreation'
>;

export interface ExpenseEditingPolicy {
  readonly lockFinancialFieldsAfterCreation: boolean;
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
  readonly disabledThroughDate?: string | null;
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
  expenseFinancialFieldsManage: 'settings.expense-financial-fields.manage',
} as const;
