import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppShellState {
  private readonly sidebarHiddenState = signal(false);

  readonly sidebarHidden = this.sidebarHiddenState.asReadonly();

  toggleSidebar(): void {
    this.sidebarHiddenState.update((hidden) => !hidden);
  }

  showSidebar(): void {
    this.sidebarHiddenState.set(false);
  }
}
