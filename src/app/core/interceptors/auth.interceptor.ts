import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { LocalizationService } from '../../shared/i18n/localization.service';
import { AuthRefreshCoordinator } from '../auth/auth-refresh-coordinator.service';
import { TOKEN_STORAGE } from '../auth/token-storage';
import { TenantContext } from '../tenant/tenant-context.service';
import { SKIP_AUTH } from './http-context.tokens';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const storage = inject(TOKEN_STORAGE);
  const tenantContext = inject(TenantContext);
  const localization = inject(LocalizationService);
  const refreshCoordinator = inject(AuthRefreshCoordinator);

  const addContext = (accessToken: string | null) => {
    let headers = request.headers;
    if (accessToken && !request.context.get(SKIP_AUTH)) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
    const tenantId = tenantContext.activeTenant()?.id;
    if (tenantId) headers = headers.set('X-Tenant-Id', tenantId);
    if (!headers.has('Accept-Language')) {
      headers = headers.set('Accept-Language', localization.language());
    }
    return request.clone({ headers });
  };

  const tokens = request.context.get(SKIP_AUTH) ? of(null) : refreshCoordinator.ensureFreshTokens();
  return tokens.pipe(
    switchMap((session) => {
      const initial = addContext(session?.accessToken ?? null);
      return next(initial).pipe(
        catchError((error: unknown) => {
          const canRefresh =
            error instanceof HttpErrorResponse &&
            error.status === 401 &&
            !request.context.get(SKIP_AUTH) &&
            Boolean(storage.load()?.refreshToken);

          if (!canRefresh) return throwError(() => error);

          // Another request may already have rotated the token while this one was in flight.
          const latest = storage.load();
          if (latest && latest.accessToken !== session?.accessToken) {
            return next(addContext(latest.accessToken));
          }

          return refreshCoordinator
            .refresh()
            .pipe(switchMap((tokens) => next(addContext(tokens.accessToken))));
        }),
      );
    }),
  );
};
