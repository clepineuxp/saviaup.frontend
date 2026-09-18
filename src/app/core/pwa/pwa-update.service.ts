import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import {
  EMPTY,
  catchError,
  exhaustMap,
  filter,
  first,
  from,
  fromEvent,
  merge,
  switchMap,
  timer,
} from 'rxjs';

const UPDATE_CHECK_INTERVAL_MS = 60_000;

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly available = signal(false);
  private readyVersion: string | null = null;
  private dismissedVersion: string | null = null;

  readonly updateAvailable = this.available.asReadonly();

  constructor() {
    const window = this.document.defaultView;
    if (!this.swUpdate.isEnabled || !window) {
      return;
    }

    // Subscribe before registration or route loading can deliver VERSION_READY.
    this.swUpdate.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.readyVersion = event.latestVersion.hash;
        this.available.set(this.readyVersion !== this.dismissedVersion);
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.warn('[PWA] VERSION_INSTALLATION_FAILED. Inspect /ngsw/state for details.');
      }
    });

    this.swUpdate.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      console.warn('[PWA] UNRECOVERABLE_STATE. A page reload is required.');
    });

    // Do not start a polling timer until Angular has stabilized. The first check
    // runs immediately, with further checks while the application is visible.
    this.appRef.isStable
      .pipe(
        first((stable) => stable),
        switchMap(() =>
          merge(
            timer(0, UPDATE_CHECK_INTERVAL_MS),
            fromEvent(window, 'focus'),
            fromEvent(window, 'online'),
            fromEvent(this.document, 'visibilitychange'),
          ),
        ),
        filter(() => this.document.visibilityState === 'visible' && window.navigator.onLine),
        exhaustMap(() =>
          from(this.swUpdate.checkForUpdate()).pipe(
            catchError(() => {
              console.warn('[PWA] UPDATE_CHECK_FAILED. Will retry when online and visible.');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  activateUpdate(): void {
    // Reload as one operation so the shell and lazy chunks use the same version.
    // This is only called after the user accepts; an active order is never
    // interrupted automatically by a background update.
    this.document.defaultView?.location.reload();
  }

  dismiss(): void {
    this.dismissedVersion = this.readyVersion;
    this.available.set(false);
  }
}
