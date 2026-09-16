import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth-store.service';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  return authStore.hasValidSession() ? true : inject(Router).createUrlTree(['/login']);
};
