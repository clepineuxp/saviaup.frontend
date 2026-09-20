import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PrintingPermission, PrintingStore } from '../data-access/printing-store.service';

const visiblePermissions: readonly PrintingPermission[] = [
  'printing.agents.read',
  'printing.agents.manage',
  'printing.zones.read',
  'printing.zones.manage',
  'printing.queue.read',
];

export const printingPermissionGuard: CanActivateFn = () => {
  const store = inject(PrintingStore);
  const router = inject(Router);
  return store.ensurePermissions().pipe(
    map(() =>
      visiblePermissions.some((permission) => store.hasPermission(permission))
        ? true
        : router.createUrlTree(['/app'], { queryParams: { denied: 'printing' } }),
    ),
    catchError(() => of(router.createUrlTree(['/app']))),
  );
};
