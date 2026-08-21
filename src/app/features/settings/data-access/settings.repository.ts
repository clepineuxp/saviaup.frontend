import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BusinessSettings,
  EnabledModulePermissions,
  OrganizationSettings,
  OrganizationUser,
  PaymentMethod,
  SavePaymentMethod,
  SaveSettingsRole,
  SettingsRole,
  UpdateOrganizationSettings,
  UpdateOrganizationUser,
} from '../models/settings.model';

export interface SettingsRepository {
  getOrganization(): Observable<OrganizationSettings>;
  updateOrganization(request: UpdateOrganizationSettings): Observable<OrganizationSettings>;
  getLogo(): Observable<Blob>;
  uploadLogo(file: File): Observable<void>;
  deleteLogo(): Observable<void>;
  getBusiness(): Observable<BusinessSettings>;
  updateBusiness(request: BusinessSettings): Observable<BusinessSettings>;
  listPaymentMethods(): Observable<readonly PaymentMethod[]>;
  createPaymentMethod(request: SavePaymentMethod): Observable<PaymentMethod>;
  updatePaymentMethod(id: string, request: SavePaymentMethod): Observable<PaymentMethod>;
  setPaymentMethodStatus(id: string, isActive: boolean): Observable<PaymentMethod>;
  deletePaymentMethod(id: string): Observable<void>;
  listPermissions(): Observable<readonly EnabledModulePermissions[]>;
  listRoles(): Observable<readonly SettingsRole[]>;
  createRole(request: SaveSettingsRole): Observable<SettingsRole>;
  updateRole(id: string, request: SaveSettingsRole): Observable<SettingsRole>;
  setRoleStatus(id: string, isActive: boolean): Observable<SettingsRole>;
  deleteRole(id: string): Observable<void>;
  listUsers(): Observable<readonly OrganizationUser[]>;
  inviteUser(email: string, roleId: string): Observable<OrganizationUser>;
  updateUser(id: string, request: UpdateOrganizationUser): Observable<OrganizationUser>;
  deleteUser(id: string): Observable<void>;
}

export const SETTINGS_REPOSITORY = new InjectionToken<SettingsRepository>('SETTINGS_REPOSITORY');
