import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  readonly updateAvailable = signal<boolean>(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.updateAvailable.set(true);
        });

      // Comprobar actualizaciones cada hora
      setInterval(() => {
        this.swUpdate.checkForUpdate().catch(() => undefined);
      }, 60 * 60 * 1000);
    }
  }

  activateUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        document.location.reload();
      });
    } else {
      document.location.reload();
    }
  }

  dismiss(): void {
    this.updateAvailable.set(false);
  }
}
