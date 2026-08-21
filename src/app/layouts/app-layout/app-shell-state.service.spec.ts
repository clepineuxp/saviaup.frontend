import { TestBed } from '@angular/core/testing';
import { AppShellState } from './app-shell-state.service';

describe('AppShellState', () => {
  it('toggles and restores the desktop sidebar', () => {
    const state = TestBed.inject(AppShellState);

    expect(state.sidebarHidden()).toBe(false);

    state.toggleSidebar();
    expect(state.sidebarHidden()).toBe(true);

    state.showSidebar();
    expect(state.sidebarHidden()).toBe(false);
  });
});
