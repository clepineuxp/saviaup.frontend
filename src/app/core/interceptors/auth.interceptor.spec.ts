import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { SKIP_AUTH } from './http-context.tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../shared/i18n/localization.service';
import { AuthRefreshCoordinator } from '../auth/auth-refresh-coordinator.service';
import { SessionTokens } from '../auth/session.model';
import { TOKEN_STORAGE, TokenStorage } from '../auth/token-storage';
import { ActiveTenant, TenantContext } from '../tenant/tenant-context.service';
import { authInterceptor } from './auth.interceptor';

const originalTokens: SessionTokens = {
  accessToken: 'old-access',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const refreshedTokens: SessionTokens = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  expiresAt: new Date(Date.now() + 120_000).toISOString(),
};

class InterceptorTokenStorage implements TokenStorage {
  private currentTokens: SessionTokens | null = originalTokens;

  load(): SessionTokens | null {
    return this.currentTokens;
  }
  save(tokens: SessionTokens): void {
    this.currentTokens = tokens;
  }
  isPersistent(): boolean {
    return false;
  }
  clear(): void {
    this.currentTokens = null;
  }
}

describe('authInterceptor', () => {
  let controller: HttpTestingController;
  const refresh = vi.fn(() => of(refreshedTokens));

  beforeEach(() => {
    const activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Savia Demo' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TOKEN_STORAGE, useClass: InterceptorTokenStorage },
        { provide: TenantContext, useValue: { activeTenant: activeTenant.asReadonly() } },
        {
          provide: AuthRefreshCoordinator,
          useValue: { refresh, ensureFreshTokens: () => of(TestBed.inject(TOKEN_STORAGE).load()) },
        },
        { provide: LocalizationService, useValue: { language: () => 'es' } },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    refresh.mockClear();
  });

  afterEach(() => controller.verify());

  it('adds authorization and tenant headers', () => {
    const client = TestBed.inject(HttpClient);

    client.get('/api/test').subscribe();
    const request = controller.expectOne('/api/test');
    expect(request.request.headers.get('Authorization')).toBe('Bearer old-access');
    expect(request.request.headers.get('X-Tenant-Id')).toBe('tenant-1');
    expect(request.request.headers.get('Accept-Language')).toBe('es');
    request.flush({});
  });

  it('refreshes once and retries a 401 request with the new token', () => {
    const client = TestBed.inject(HttpClient);
    const completed = vi.fn();

    client.get('/api/protected').subscribe({ next: completed });
    controller.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });

    const retry = controller.expectOne('/api/protected');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ ok: true });
    expect(completed).toHaveBeenCalledOnce();
  });

  it('waits for renewal before sending a protected request', () => {
    const ready = new Subject<SessionTokens>();
    vi.spyOn(TestBed.inject(AuthRefreshCoordinator), 'ensureFreshTokens').mockReturnValue(ready);
    TestBed.inject(HttpClient).get('/api/protected').subscribe();
    controller.expectNone('/api/protected');
    ready.next(refreshedTokens);
    ready.complete();
    const request = controller.expectOne('/api/protected');
    expect(request.request.headers.get('Authorization')).toBe('Bearer new-access');
    request.flush({});
  });

  it('reuses rotated credentials for a delayed 401 without another refresh', () => {
    TestBed.inject(HttpClient).get('/api/protected').subscribe();
    TestBed.inject(TOKEN_STORAGE).save(refreshedTokens, false);
    controller.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });
    const retry = controller.expectOne('/api/protected');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    expect(refresh).not.toHaveBeenCalled();
    retry.flush({});
  });

  it('never recursively renews a public refresh request', () => {
    const ensure = vi.spyOn(TestBed.inject(AuthRefreshCoordinator), 'ensureFreshTokens');
    TestBed.inject(HttpClient)
      .post(
        '/api/auth/refresh',
        {},
        {
          context: new HttpContext().set(SKIP_AUTH, true),
        },
      )
      .subscribe({ error: () => undefined });
    const request = controller.expectOne('/api/auth/refresh');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(ensure).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
