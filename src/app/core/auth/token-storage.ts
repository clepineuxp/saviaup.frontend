import { InjectionToken } from '@angular/core';
import { SessionTokens } from './session.model';

export interface TokenStorage {
  load(): SessionTokens | null;
  save(tokens: SessionTokens, persistent: boolean): void;
  isPersistent(): boolean;
  clear(): void;
}

export const TOKEN_STORAGE = new InjectionToken<TokenStorage>('TOKEN_STORAGE');
