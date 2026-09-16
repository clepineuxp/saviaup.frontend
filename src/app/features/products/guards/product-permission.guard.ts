import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProductStore } from '../data-access/product-store.service';

export const productReadGuard: CanActivateFn = () => {
  const store = inject(ProductStore);
  const router = inject(Router);
  return store.ensurePermissions().pipe(
    map(() =>
      store.hasPermission('products.read')
        ? true
        : router.createUrlTree(['/app'], { queryParams: { denied: 'products.read' } }),
    ),
    catchError(() => of(router.createUrlTree(['/app']))),
  );
};
