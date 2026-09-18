import { DOCUMENT } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRefreshCoordinator } from './auth-refresh-coordinator.service';
import { AuthSessionLifecycle } from './auth-session-lifecycle.service';

describe('AuthSessionLifecycle', () => {
  let stable: Subject<boolean>;
  let browser: EventTarget;
  let testDocument: Document;
  let visible: boolean;
  let online: boolean;
  const ensureFreshTokens = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    stable = new Subject<boolean>();
    visible = online = true;
    ensureFreshTokens.mockReset().mockReturnValue(of(null));
    browser = Object.assign(new EventTarget(), {
      navigator: {
        get onLine() {
          return online;
        },
      },
    });
    testDocument = document.implementation.createHTMLDocument('Session tests');
    Object.defineProperty(testDocument, 'defaultView', { value: browser });
    Object.defineProperty(testDocument, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: testDocument },
        { provide: ApplicationRef, useValue: { isStable: stable } },
        { provide: AuthRefreshCoordinator, useValue: { ensureFreshTokens } },
      ],
    });
    TestBed.inject(AuthSessionLifecycle);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('checks after stabilization and during idle foreground time', async () => {
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ensureFreshTokens).not.toHaveBeenCalled();
    stable.next(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ensureFreshTokens).toHaveBeenCalledTimes(2);
  });

  it('checks immediately on return after a long background suspension', async () => {
    stable.next(true);
    visible = false;
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(ensureFreshTokens).not.toHaveBeenCalled();
    visible = true;
    testDocument.dispatchEvent(new Event('visibilitychange'));
    expect(ensureFreshTokens).toHaveBeenCalledOnce();
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(new Event('pageshow'));
    expect(ensureFreshTokens).toHaveBeenCalledTimes(3);
  });

  it('retries on reconnect after offline or transient failure', async () => {
    stable.next(true);
    online = false;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ensureFreshTokens).not.toHaveBeenCalled();
    online = true;
    ensureFreshTokens.mockReturnValueOnce(throwError(() => new Error('Offline')));
    browser.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ensureFreshTokens).toHaveBeenCalledTimes(2);
  });

  it('releases timers and listeners when destroyed', async () => {
    stable.next(true);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(60_000);
    browser.dispatchEvent(new Event('focus'));
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });
});
