import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';

export type DigitalMenuPermission =
  | 'digital-menu.access'
  | 'digital-menu.enable'
  | 'digital-menu.style.manage'
  | 'digital-menu.items.manage';

const requireDigitalMenuPermission = (required?: DigitalMenuPermission): CanActivateFn => () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map((user) => {
      const permissions = new Set(user.permissions);
      const allowed =
        permissions.has('digital-menu.access') && (!required || permissions.has(required));
      return allowed
        ? true
        : router.createUrlTree(['/app'], { queryParams: { denied: required ?? 'digital-menu.access' } });
    }),
    catchError(() => of(router.createUrlTree(['/app']))),
  );
};

export const digitalMenuAccessGuard = requireDigitalMenuPermission();
export const digitalMenuItemsGuard = requireDigitalMenuPermission('digital-menu.items.manage');
export const digitalMenuStyleGuard = requireDigitalMenuPermission('digital-menu.style.manage');
