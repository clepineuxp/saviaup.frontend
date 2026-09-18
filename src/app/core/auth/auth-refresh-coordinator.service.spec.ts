import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Subject, throwError, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/http/api-error';
import { AUTH_REPOSITORY } from './auth-repository';
import { AuthStore } from './auth-store.service';
import { AuthRefreshCoordinator } from './auth-refresh-coordinator.service';
import { SessionTokens } from './session.model';
import { TOKEN_STORAGE } from './token-storage';

describe('AuthRefreshCoordinator', () => {
  let current: SessionTokens | null;
  let coordinator: AuthRefreshCoordinator;
  const refresh = vi.fn();
  const accept = vi.fn();
  const clear = vi.fn(() => {
    current = null;
  });
  const fresh = (): SessionTokens => ({
    accessToken: 'test-access',
    refreshToken: 'test-rotated',
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    current = {
      ...fresh(),
      refreshToken: 'test-initial',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };
    refresh.mockReturnValue(of(fresh()));
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_REPOSITORY, useValue: { refresh } },
        { provide: AuthStore, useValue: { acceptRefreshedTokens: accept, clearSession: clear } },
        {
          provide: TOKEN_STORAGE,
          useValue: {
            load: () => current,
            isPersistent: () => true,
            save: (value: SessionTokens, persistent: boolean) => {
              expect(persistent).toBe(true);
              current = value;
            },
          },
        },
      ],
    });
    coordinator = TestBed.inject(AuthRefreshCoordinator);
  });

  it('renews an expired access token and persists both rotated tokens', async () => {
    await firstValueFrom(coordinator.ensureFreshTokens());
    expect(refresh).toHaveBeenCalledOnce();
    expect(current?.refreshToken).toBe('test-rotated');
    expect(accept).toHaveBeenCalledOnce();
  });

  it('shares refresh between simultaneous requests and wake-up events', async () => {
    const response = new Subject<SessionTokens>();
    refresh.mockReturnValue(response);
    const first = firstValueFrom(coordinator.ensureFreshTokens());
    const second = firstValueFrom(coordinator.ensureFreshTokens());
    expect(refresh).toHaveBeenCalledOnce();
    response.next(fresh());
    response.complete();
    await Promise.all([first, second]);
    await firstValueFrom(coordinator.ensureFreshTokens());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([0, 408, 429, 500, 503])(
    'preserves credentials on transient HTTP %s and retries later',
    async (status) => {
      refresh.mockReturnValueOnce(
        throwError(() => new ApiError('network', status, 'Temporary failure')),
      );
      await expect(firstValueFrom(coordinator.ensureFreshTokens())).rejects.toBeInstanceOf(
        ApiError,
      );
      expect(clear).not.toHaveBeenCalled();
      expect(current).not.toBeNull();
      await firstValueFrom(coordinator.ensureFreshTokens());
      expect(refresh).toHaveBeenCalledTimes(2);
    },
  );

  it('clears a revoked refresh token rejected by the server', async () => {
    refresh.mockReturnValue(
      throwError(() => new ApiError('unauthenticated', 401, 'Invalid session')),
    );
    await expect(firstValueFrom(coordinator.refresh())).rejects.toBeInstanceOf(ApiError);
    expect(clear).toHaveBeenCalledOnce();
  });

  it('does not attempt renewal after refresh expiry', async () => {
    current = { ...fresh(), refreshTokenExpiresAt: new Date(0).toISOString() };
    await expect(firstValueFrom(coordinator.ensureFreshTokens())).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('does not restore a session after logout during refresh', async () => {
    const response = new Subject<SessionTokens>();
    refresh.mockReturnValue(response);
    const request = firstValueFrom(coordinator.refresh());
    current = null;
    response.next(fresh());
    response.complete();
    await expect(request).rejects.toThrow('Session changed');
    expect(current).toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });

  it('does not clear a replacement session when an old refresh fails', async () => {
    const response = new Subject<SessionTokens>();
    refresh.mockReturnValue(response);
    const request = firstValueFrom(coordinator.refresh());
    current = fresh();
    response.error(new ApiError('unauthenticated', 401, 'Invalid session'));
    await expect(request).rejects.toBeInstanceOf(ApiError);
    expect(clear).not.toHaveBeenCalled();
  });
});
