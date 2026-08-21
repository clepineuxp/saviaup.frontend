import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
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
import { SettingsRepository } from './settings.repository';

@Injectable()
export class HttpSettingsRepository implements SettingsRepository {
  private readonly api = inject(ApiClient);
  getOrganization(): Observable<OrganizationSettings> {
    return this.api.get(API_ENDPOINTS.settings.organization);
  }
  updateOrganization(request: UpdateOrganizationSettings): Observable<OrganizationSettings> {
    return this.api.put(API_ENDPOINTS.settings.organization, request);
  }
  getLogo(): Observable<Blob> {
    return this.api.getBlob(API_ENDPOINTS.settings.organizationLogo);
  }
  uploadLogo(file: File): Observable<void> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post(API_ENDPOINTS.settings.organizationLogo, form);
  }
  deleteLogo(): Observable<void> {
    return this.api.delete(API_ENDPOINTS.settings.organizationLogo);
  }
  getBusiness(): Observable<BusinessSettings> {
    return this.api.get(API_ENDPOINTS.settings.business);
  }
  updateBusiness(request: BusinessSettings): Observable<BusinessSettings> {
    return this.api.put(API_ENDPOINTS.settings.business, request);
  }
  listPaymentMethods(): Observable<readonly PaymentMethod[]> {
    return this.api.get(API_ENDPOINTS.settings.paymentMethods, {
      params: { includeInactive: true },
    });
  }
  createPaymentMethod(request: SavePaymentMethod): Observable<PaymentMethod> {
    return this.api.post(API_ENDPOINTS.settings.paymentMethods, request);
  }
  updatePaymentMethod(id: string, request: SavePaymentMethod): Observable<PaymentMethod> {
    return this.api.put(API_ENDPOINTS.settings.paymentMethod(id), request);
  }
  setPaymentMethodStatus(id: string, isActive: boolean): Observable<PaymentMethod> {
    return this.api.patch(API_ENDPOINTS.settings.paymentMethodStatus(id), { isActive });
  }
  deletePaymentMethod(id: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.settings.paymentMethod(id));
  }
  listPermissions(): Observable<readonly EnabledModulePermissions[]> {
    return this.api.get(API_ENDPOINTS.settings.access.permissions);
  }
  listRoles(): Observable<readonly SettingsRole[]> {
    return this.api.get(API_ENDPOINTS.settings.access.roles, { params: { includeInactive: true } });
  }
  createRole(request: SaveSettingsRole): Observable<SettingsRole> {
    return this.api.post(API_ENDPOINTS.settings.access.roles, request);
  }
  updateRole(id: string, request: SaveSettingsRole): Observable<SettingsRole> {
    return this.api.put(API_ENDPOINTS.settings.access.role(id), request);
  }
  setRoleStatus(id: string, isActive: boolean): Observable<SettingsRole> {
    return this.api.patch(API_ENDPOINTS.settings.access.roleStatus(id), { isActive });
  }
  deleteRole(id: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.settings.access.role(id));
  }
  listUsers(): Observable<readonly OrganizationUser[]> {
    return this.api.get(API_ENDPOINTS.settings.access.users);
  }
  inviteUser(email: string, roleId: string): Observable<OrganizationUser> {
    return this.api.post(API_ENDPOINTS.settings.access.users, { email, roleId });
  }
  updateUser(id: string, request: UpdateOrganizationUser): Observable<OrganizationUser> {
    return this.api.patch(API_ENDPOINTS.settings.access.user(id), request);
  }
  deleteUser(id: string): Observable<void> {
    return this.api.delete(API_ENDPOINTS.settings.access.user(id));
  }
}
