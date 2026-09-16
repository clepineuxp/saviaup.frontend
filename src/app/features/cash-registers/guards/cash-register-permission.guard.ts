import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';

export const cashRegisterPermissionGuard: CanActivateFn = () => {
  const store = inject(AuthenticatedContextStore);
  const router = inject(Router);

  return store.ensureLoaded().pipe(
    map(() => {
      const hasOption = store.options().some((option) => option.code === 'cash-registers.manage');
      if (hasOption) {
        return true;
      }
      return router.createUrlTree(['/app']);
    }),
  );
};
