import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthRefreshCoordinator } from '../auth/auth-refresh-coordinator.service';
import { TOKEN_STORAGE } from '../auth/token-storage';
import { TenantContext } from '../tenant/tenant-context.service';
import { SKIP_AUTH } from './http-context.tokens';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const storage = inject(TOKEN_STORAGE);
  const tenantContext = inject(TenantContext);
  const refreshCoordinator = inject(AuthRefreshCoordinator);

  const addContext = (accessToken: string | null) => {
    let headers = request.headers;
    if (accessToken && !request.context.get(SKIP_AUTH)) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
    const tenantId = tenantContext.activeTenant()?.id;
    if (tenantId) headers = headers.set('X-Tenant-Id', tenantId);
    return request.clone({ headers });
  };

  const initial = addContext(storage.load()?.accessToken ?? null);
  return next(initial).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.context.get(SKIP_AUTH) &&
        Boolean(storage.load()?.refreshToken);

      if (!canRefresh) return throwError(() => error);

      return refreshCoordinator
        .refresh()
        .pipe(switchMap((tokens) => next(addContext(tokens.accessToken))));
    }),
  );
};
