import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth-store.service';
import { TenantContext } from '../tenant/tenant-context.service';

export const entryGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!inject(AuthStore).hasValidSession()) return router.createUrlTree(['/login']);
  return router.createUrlTree([inject(TenantContext).activeTenant() ? '/app' : '/select-tenant']);
};
