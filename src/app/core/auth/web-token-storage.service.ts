import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { SessionTokens } from './session.model';
import { TokenStorage } from './token-storage';

const TOKEN_KEY = 'saviaup.auth.tokens';

@Injectable()
export class WebTokenStorage implements TokenStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  load(): SessionTokens | null {
    if (!this.isBrowser) return null;

    const serialized = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    if (!serialized) return null;

    try {
      const tokens = JSON.parse(serialized) as SessionTokens;
      return tokens.accessToken && tokens.refreshToken && tokens.expiresAt ? tokens : null;
    } catch {
      this.clear();
      return null;
    }
  }

  save(tokens: SessionTokens, persistent: boolean): void {
    if (!this.isBrowser) return;

    this.clear();
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }

  isPersistent(): boolean {
    return this.isBrowser && localStorage.getItem(TOKEN_KEY) !== null;
  }

  clear(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
