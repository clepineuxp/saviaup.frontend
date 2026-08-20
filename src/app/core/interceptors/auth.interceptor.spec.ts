import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
        { provide: AuthRefreshCoordinator, useValue: { refresh } },
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
});
