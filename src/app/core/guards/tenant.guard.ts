import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantContext } from '../tenant/tenant-context.service';

export const tenantGuard: CanActivateFn = () =>
  inject(TenantContext).activeTenant() ? true : inject(Router).createUrlTree(['/select-tenant']);
