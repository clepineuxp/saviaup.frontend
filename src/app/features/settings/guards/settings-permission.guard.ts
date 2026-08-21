import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';

export const settingsPermissionGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(
    map((user) =>
      user.permissions.some((permission) => permission.startsWith('settings.'))
        ? true
        : router.createUrlTree(['/app'], { queryParams: { denied: 'settings' } }),
    ),
    catchError(() => of(router.createUrlTree(['/app']))),
  );
};
