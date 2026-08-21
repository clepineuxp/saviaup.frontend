import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { TableStore } from '../data-access/table-store.service';
import { TablePermission } from '../table-permissions';

const permissionGuard =
  (permission: TablePermission): CanActivateFn =>
  () => {
    const store = inject(TableStore);
    const router = inject(Router);
    return store.ensurePermissions().pipe(
      map(() =>
        store.hasPermission(permission)
          ? true
          : router.createUrlTree(['/app'], { queryParams: { denied: permission } }),
      ),
      catchError(() => of(router.createUrlTree(['/app']))),
    );
  };

export const tableReadGuard = permissionGuard('tables.read');
export const tableManageGuard = permissionGuard('tables.manage');
