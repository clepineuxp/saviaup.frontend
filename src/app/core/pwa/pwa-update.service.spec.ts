import { DOCUMENT } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let stable: Subject<boolean>;
  let versions: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let browser: EventTarget;
  let testDocument: Document;
  let visible: boolean;
  let online: boolean;
  const checkForUpdate = vi.fn<() => Promise<boolean>>();
  const reload = vi.fn();

  const ready = (hash = 'version-2'): void => {
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'version-1' },
      latestVersion: { hash },
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    checkForUpdate.mockReset().mockResolvedValue(false);
    reload.mockReset();
    stable = new Subject<boolean>();
    versions = new Subject<VersionEvent>();
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    visible = true;
    online = true;
    browser = Object.assign(new EventTarget(), {
      navigator: {
        get onLine() {
          return online;
        },
      },
      location: { reload },
    });
    testDocument = document.implementation.createHTMLDocument('PWA tests');
    Object.defineProperty(testDocument, 'defaultView', { value: browser });
    Object.defineProperty(testDocument, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: testDocument },
        { provide: ApplicationRef, useValue: { isStable: stable.asObservable() } },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versions.asObservable(),
            unrecoverable: unrecoverable.asObservable(),
            checkForUpdate,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('checks immediately after stability and every minute, without blocking startup', async () => {
    TestBed.inject(PwaUpdateService);
    stable.next(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(checkForUpdate).not.toHaveBeenCalled();

    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('checks on focus, visibility restoration and reconnection', async () => {
    TestBed.inject(PwaUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);

    browser.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);

    visible = false;
    testDocument.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);

    visible = true;
    testDocument.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(3);

    online = false;
    await vi.advanceTimersByTimeAsync(60_000);
    browser.dispatchEvent(new Event('focus'));
    expect(checkForUpdate).toHaveBeenCalledTimes(3);

    online = true;
    browser.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(4);
  });

  it('does not overlap checks when timer and browser events happen together', async () => {
    let finishCheck: (value: boolean) => void = () => undefined;
    checkForUpdate.mockReturnValueOnce(
      new Promise((resolve) => {
        finishCheck = resolve;
      }),
    );
    TestBed.inject(PwaUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    finishCheck(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('retries after a failed check without logging potentially sensitive error details', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    checkForUpdate.mockRejectedValueOnce(new Error('private transport details'));
    TestBed.inject(PwaUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(warn).toHaveBeenCalledWith(
      '[PWA] UPDATE_CHECK_FAILED. Will retry when online and visible.',
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('subscribes before stability and prompts only after download, never reloading automatically', () => {
    const service = TestBed.inject(PwaUpdateService);
    versions.next({ type: 'VERSION_DETECTED', version: { hash: 'version-2' } });
    expect(service.updateAvailable()).toBe(false);
    ready();
    expect(service.updateAvailable()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    service.activateUpdate();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps a dismissed version hidden but shows a newer one', () => {
    const service = TestBed.inject(PwaUpdateService);
    ready();
    service.dismiss();
    ready();
    expect(service.updateAvailable()).toBe(false);
    ready('version-3');
    expect(service.updateAvailable()).toBe(true);
  });

  it('reports installation and unrecoverable failures without claiming an update is ready', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = TestBed.inject(PwaUpdateService);
    versions.next({
      type: 'VERSION_INSTALLATION_FAILED',
      version: { hash: 'version-2' },
      error: 'Hash mismatch',
    });
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'Missing chunk' });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(service.updateAvailable()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('stops timers, browser listeners and version subscriptions on destruction', async () => {
    const service = TestBed.inject(PwaUpdateService);
    stable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    TestBed.resetTestingModule();
    browser.dispatchEvent(new Event('focus'));
    browser.dispatchEvent(new Event('online'));
    testDocument.dispatchEvent(new Event('visibilitychange'));
    ready();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    expect(service.updateAvailable()).toBe(false);
  });

  it('does not poll or subscribe when service workers are disabled', async () => {
    TestBed.overrideProvider(SwUpdate, { useValue: { isEnabled: false, checkForUpdate } });
    const service = TestBed.inject(PwaUpdateService);
    stable.next(true);
    ready();
    browser.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(service.updateAvailable()).toBe(false);
  });
});
