import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  catchError,
  exhaustMap,
  filter,
  first,
  fromEvent,
  merge,
  switchMap,
  timer,
} from 'rxjs';
import { AuthRefreshCoordinator } from './auth-refresh-coordinator.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionLifecycle {
  private readonly document = inject(DOCUMENT);
  private readonly refresh = inject(AuthRefreshCoordinator);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const window = this.document.defaultView;
    if (!window) return;
    // Start timers after stabilization so service-worker registration is not delayed.
    inject(ApplicationRef)
      .isStable.pipe(
        first(Boolean),
        switchMap(() =>
          merge(
            timer(0, 30_000),
            fromEvent(window, 'focus'),
            fromEvent(window, 'pageshow'),
            fromEvent(window, 'online'),
            fromEvent(this.document, 'visibilitychange'),
          ),
        ),
        filter(() => this.document.visibilityState === 'visible' && window.navigator.onLine),
        exhaustMap(() =>
          this.refresh.ensureFreshTokens().pipe(
            // Transient failures preserve credentials and are retried on the next wake-up.
            // Definitive authentication failures are handled by the coordinator.
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
