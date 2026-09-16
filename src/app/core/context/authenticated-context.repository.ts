import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SupportedLanguage } from '../../shared/i18n/translation.types';
import { AvailableModulesResponse, UserInfo } from './authenticated-context.model';

export interface AuthenticatedContextRepository {
  userInfo(): Observable<UserInfo>;
  availableModules(language: SupportedLanguage): Observable<AvailableModulesResponse>;
}

export const AUTHENTICATED_CONTEXT_REPOSITORY = new InjectionToken<AuthenticatedContextRepository>(
  'AUTHENTICATED_CONTEXT_REPOSITORY',
);
