import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../models/user.model';
import { AuthenticatedContextStore } from '../context/authenticated-context.store';
import { TenantContext } from '../tenant/tenant-context.service';
import { AUTH_REPOSITORY, AuthRepository, AuthResult } from './auth-repository';
import { AuthStore } from './auth-store.service';
import { SessionTokens } from './session.model';
import { TOKEN_STORAGE, TokenStorage } from './token-storage';

const testUser: User = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Savia',
  email: 'ana@savia.test',
  permissions: [],
};

const testTokens: SessionTokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

class MemoryTokenStorage implements TokenStorage {
  value: SessionTokens | null = null;
  persistent = false;

  load(): SessionTokens | null {
    return this.value;
  }

  save(tokens: SessionTokens, persistent: boolean): void {
    this.value = tokens;
    this.persistent = persistent;
  }

  isPersistent(): boolean {
    return this.persistent;
  }

  clear(): void {
    this.value = null;
  }
}

class FakeAuthRepository implements AuthRepository {
  result: AuthResult = {
    session: { tokens: testTokens, user: testUser },
    nextStep: 'tenant-selection',
  };

  login(): Observable<AuthResult> {
    return of(this.result);
  }

  register(): Observable<AuthResult> {
    return of({ session: { tokens: testTokens, user: testUser }, nextStep: 'tenant-selection' });
  }

  forgotPassword(): Observable<void> {
    return of(undefined);
  }

  refresh(): Observable<SessionTokens> {
    return of(testTokens);
  }

  logout(): Observable<void> {
    return of(undefined);
  }

  currentUser(): Observable<User> {
    return of(testUser);
  }
}

describe('AuthStore', () => {
  let store: AuthStore;
  let storage: MemoryTokenStorage;
  let repository: FakeAuthRepository;
  const clearContext = vi.fn();
  const loadContext = vi.fn(() =>
    of({
      userInfo: {
        firstName: 'Ana',
        lastName: 'Savia',
        organization: { id: 'tenant-1', name: 'Savia Demo' },
        role: { id: 'role-1', code: 'OWNER', name: 'Owner' },
      },
      sections: [],
      emptyStateMessage: 'Sin módulos',
    }),
  );

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storage = new MemoryTokenStorage();
    repository = new FakeAuthRepository();
    clearContext.mockClear();
    loadContext.mockClear();
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        TenantContext,
        {
          provide: AuthenticatedContextStore,
          useValue: { clear: clearContext, load: loadContext },
        },
        { provide: AUTH_REPOSITORY, useValue: repository },
        { provide: TOKEN_STORAGE, useValue: storage },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('persists the contextual session before loading the app context', async () => {
    repository.result = {
      session: {
        tokens: testTokens,
        user: testUser,
        activeTenant: { id: 'tenant-1', name: 'Savia Demo' },
      },
      nextStep: 'app',
    };
    loadContext.mockImplementationOnce(() => {
      expect(storage.value).toEqual(testTokens);
      return of({
        userInfo: {
          firstName: 'Ana',
          lastName: 'Savia',
          organization: { id: 'tenant-1', name: 'Savia Demo' },
          role: { id: 'role-1', code: 'OWNER', name: 'Owner' },
        },
        sections: [],
        emptyStateMessage: 'Sin módulos',
      });
    });

    await firstValueFrom(store.login({ email: 'ana@savia.test', password: 'Savia123*' }, true));

    expect(loadContext).toHaveBeenCalledOnce();
    expect(TestBed.inject(TenantContext).activeTenant()?.id).toBe('tenant-1');
  });

  it('stores a successful session using the requested persistence strategy', async () => {
    await firstValueFrom(store.login({ email: 'ana@savia.test', password: 'Savia123*' }, true));

    expect(storage.value).toEqual(testTokens);
    expect(storage.persistent).toBe(true);
    expect(store.user()).toEqual(testUser);
    expect(store.hasValidSession()).toBe(true);
    expect(loadContext).not.toHaveBeenCalled();
  });

  it('clears authentication and tenant context on logout', async () => {
    const tenantContext = TestBed.inject(TenantContext);
    await firstValueFrom(store.login({ email: 'ana@savia.test', password: 'Savia123*' }, false));
    tenantContext.select({ id: 'tenant-1', name: 'Savia Demo' });

    await firstValueFrom(store.logout());

    expect(storage.value).toBeNull();
    expect(store.user()).toBeNull();
    expect(tenantContext.activeTenant()).toBeNull();
    expect(clearContext).toHaveBeenCalled();
  });
});
