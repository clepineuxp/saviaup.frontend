import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { ApiError } from '../../shared/http/api-error';
import { RequestStatus } from '../../shared/models/request-state.model';
import { AuthenticatedContextStore } from '../context/authenticated-context.store';
import { User } from '../models/user.model';
import { TenantContext } from '../tenant/tenant-context.service';
import { AUTH_REPOSITORY, AuthResult, LoginCommand, RegisterCommand } from './auth-repository';
import { AuthSession, SessionTokens } from './session.model';
import { TOKEN_STORAGE } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly repository = inject(AUTH_REPOSITORY);
  private readonly tokenStorage = inject(TOKEN_STORAGE);
  private readonly tenantContext = inject(TenantContext);
  private readonly authenticatedContext = inject(AuthenticatedContextStore);
  private readonly tokensState = signal<SessionTokens | null>(this.tokenStorage.load());
  private readonly userState = signal<User | null>(null);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<string | null>(null);

  readonly tokens = this.tokensState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly isAuthenticated = computed(() => this.hasValidSession());

  hasValidSession(): boolean {
    const tokens = this.tokensState();
    return tokens !== null && new Date(tokens.expiresAt).getTime() > Date.now();
  }

  login(command: LoginCommand, rememberMe: boolean): Observable<AuthResult> {
    return this.track(
      this.repository.login(command).pipe(
        tap((result) => {
          if (result.session) this.setSession(result.session, rememberMe);
        }),
        switchMap((result) => this.bootstrapContext(result)),
      ),
    );
  }

  register(command: RegisterCommand): Observable<AuthResult> {
    return this.track(
      this.repository.register(command).pipe(
        tap((result) => {
          if (result.session) this.setSession(result.session, true);
        }),
      ),
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.track(this.repository.forgotPassword(email));
  }

  loadCurrentUser(): Observable<User> {
    return this.repository.currentUser().pipe(tap((user) => this.userState.set(user)));
  }

  logout(): Observable<void> {
    const refreshToken = this.tokensState()?.refreshToken ?? null;
    return this.repository.logout(refreshToken).pipe(
      catchError(() => [undefined]),
      finalize(() => this.clearSession()),
    );
  }

  acceptRefreshedTokens(tokens: SessionTokens): void {
    this.tokensState.set(tokens);
  }

  acceptContextualTokens(tokens: SessionTokens): void {
    const persistent = this.tokenStorage.isPersistent();
    this.tokenStorage.save(tokens, persistent);
    this.tokensState.set(tokens);
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.authenticatedContext.clear();
    this.tenantContext.clear();
    this.tokensState.set(null);
    this.userState.set(null);
    this.statusState.set('idle');
    this.errorState.set(null);
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private setSession(session: AuthSession, persistent: boolean): void {
    this.authenticatedContext.clear();
    this.tokenStorage.save(session.tokens, persistent);
    this.tokensState.set(session.tokens);
    this.userState.set(session.user);
    if (session.activeTenant) this.tenantContext.select(session.activeTenant);
    else this.tenantContext.clear();
  }

  private bootstrapContext(result: AuthResult): Observable<AuthResult> {
    if (!result.session || result.nextStep !== 'app') return of(result);
    return this.authenticatedContext.load().pipe(map(() => result));
  }

  private track<T>(request: Observable<T>): Observable<T> {
    this.statusState.set('loading');
    this.errorState.set(null);
    return request.pipe(
      tap(() => this.statusState.set('success')),
      catchError((error: unknown) => {
        const message =
          error instanceof ApiError ? error.message : 'No pudimos completar la solicitud.';
        this.errorState.set(message);
        this.statusState.set('error');
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.statusState() === 'loading') this.statusState.set('idle');
      }),
    );
  }
}
