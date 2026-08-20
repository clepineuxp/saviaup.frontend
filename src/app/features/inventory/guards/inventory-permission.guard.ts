import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { InventoryStore } from '../data-access/inventory-store.service';
import { InventoryPermission } from '../inventory-permissions';

export const inventoryPermissionGuard =
  (permission: InventoryPermission): CanActivateFn =>
  () => {
    const store = inject(InventoryStore);
    const router = inject(Router);
    return store
      .ensurePermissions()
      .pipe(
        map(() =>
          store.hasPermission(permission)
            ? true
            : router.createUrlTree(['/app/inventory'], { queryParams: { denied: permission } }),
        ),
      );
  };
