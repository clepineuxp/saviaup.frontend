import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AuthStore } from '../auth/auth-store.service';
import { ActiveTenant, TenantContext } from '../tenant/tenant-context.service';
import { authGuard } from './auth.guard';
import { tenantGuard } from './tenant.guard';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('route guards', () => {
  it('AuthGuard redirects unauthenticated users to login', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { hasValidSession: () => false } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('AuthGuard allows a valid session', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { hasValidSession: () => true } },
      ],
    });

    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('TenantGuard redirects when no active tenant exists', () => {
    TestBed.resetTestingModule();
    const activeTenant = signal<ActiveTenant | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TenantContext, useValue: { activeTenant: activeTenant.asReadonly() } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => tenantGuard(route, state));
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/select-tenant');
  });
});
