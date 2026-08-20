import { inject, Injectable } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, tap, throwError } from 'rxjs';
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

  refresh(): Observable<SessionTokens> {
    if (this.refreshRequest) return this.refreshRequest;

    const stored = this.tokenStorage.load();
    if (!stored?.refreshToken) return throwError(() => new Error('Missing refresh token'));

    const persistent = this.tokenStorage.isPersistent();
    this.refreshRequest = this.repository.refresh(stored.refreshToken).pipe(
      tap((tokens) => {
        this.tokenStorage.save(tokens, persistent);
        this.authStore.acceptRefreshedTokens(tokens);
      }),
      catchError((error: unknown) => {
        this.authStore.clearSession();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshRequest = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshRequest;
  }
}
