import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth-store.service';
import { TenantContext } from '../tenant/tenant-context.service';

export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  if (!authStore.hasValidSession()) return true;
  const path = inject(TenantContext).activeTenant() ? '/app' : '/select-tenant';
  return inject(Router).createUrlTree([path]);
};
