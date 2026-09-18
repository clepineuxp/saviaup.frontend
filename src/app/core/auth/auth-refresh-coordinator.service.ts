import { inject, Injectable } from '@angular/core';
import { catchError, defer, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../shared/http/api-error';
import { AUTH_REPOSITORY } from './auth-repository';
import { AuthStore } from './auth-store.service';
import { SessionTokens } from './session.model';
import { TOKEN_STORAGE } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthRefreshCoordinator {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly tokenStorage = inject(TOKEN_STORAGE);
  private readonly authStore = inject(AuthStore);
  private refreshRequest?: Observable<SessionTokens>;

  ensureFreshTokens(): Observable<SessionTokens | null> {
    return defer(() => {
      const stored = this.tokenStorage.load();
      if (!stored) return of(null);
      if (this.refreshRequest) return this.refreshRequest;
      if (stored.refreshTokenExpiresAt && Date.parse(stored.refreshTokenExpiresAt) <= Date.now()) {
        return this.refresh();
      }
      if (Date.parse(stored.expiresAt) > Date.now() + 60_000) return of(stored);
      return this.refresh();
    });
  }

  refresh(): Observable<SessionTokens> {
    if (this.refreshRequest) return this.refreshRequest;

    const stored = this.tokenStorage.load();
    if (!stored?.refreshToken) return throwError(() => new Error('Missing refresh token'));
    if (stored.refreshTokenExpiresAt && Date.parse(stored.refreshTokenExpiresAt) <= Date.now()) {
      this.authStore.clearSession();
      return throwError(() => new ApiError('unauthenticated', 401, 'Session expired'));
    }

    const persistent = this.tokenStorage.isPersistent();
    this.refreshRequest = defer(() => this.repository.refresh(stored.refreshToken)).pipe(
      tap((tokens) => {
        // A late response must not restore a logged-out or replaced session.
        if (this.tokenStorage.load()?.refreshToken !== stored.refreshToken) {
          throw new Error('Session changed during refresh');
        }
        this.tokenStorage.save(tokens, persistent);
        this.authStore.acceptRefreshedTokens(tokens);
      }),
      catchError((error: unknown) => {
        if (
          (error instanceof ApiError || error instanceof HttpErrorResponse) &&
          error.status === 401 &&
          this.tokenStorage.load()?.refreshToken === stored.refreshToken
        )
          this.authStore.clearSession();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshRequest = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshRequest;
  }
}
