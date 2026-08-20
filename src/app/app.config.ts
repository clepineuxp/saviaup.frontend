import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AUTH_REPOSITORY, AuthRepository } from './core/auth/auth-repository';
import { TOKEN_STORAGE } from './core/auth/token-storage';
import { WebTokenStorage } from './core/auth/web-token-storage.service';
import { APP_ENVIRONMENT } from './core/config/app-environment';
import {
  AUTHENTICATED_CONTEXT_REPOSITORY,
  AuthenticatedContextRepository,
} from './core/context/authenticated-context.repository';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { HttpAuthenticatedContextRepository } from './features/app/data-access/http-authenticated-context.repository';
import { MockAuthenticatedContextRepository } from './features/app/data-access/mock-authenticated-context.repository';
import { HttpAuthRepository } from './features/auth/data-access/http-auth.repository';
import { MockAuthRepository } from './features/auth/data-access/mock-auth.repository';
import { HttpTenantRepository } from './features/tenant/data-access/http-tenant.repository';
import { MockTenantRepository } from './features/tenant/data-access/mock-tenant.repository';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from './features/tenant/data-access/tenant.repository';
import { routes } from './app.routes';
import { HttpTranslationRepository } from './shared/i18n/http-translation.repository';
import { LocalizationService } from './shared/i18n/localization.service';
import { MockTranslationRepository } from './shared/i18n/mock-translation.repository';
import {
  TRANSLATION_REPOSITORY,
  TranslationRepository,
} from './shared/i18n/translation.repository';

const authRepositoryFactory = (): AuthRepository =>
  inject(APP_ENVIRONMENT).useMockApi ? inject(MockAuthRepository) : inject(HttpAuthRepository);

const tenantRepositoryFactory = (): TenantRepository =>
  inject(APP_ENVIRONMENT).useMockApi ? inject(MockTenantRepository) : inject(HttpTenantRepository);

const translationRepositoryFactory = (): TranslationRepository =>
  inject(APP_ENVIRONMENT).useMockApi
    ? inject(MockTranslationRepository)
    : inject(HttpTranslationRepository);

const authenticatedContextRepositoryFactory = (): AuthenticatedContextRepository =>
  inject(APP_ENVIRONMENT).useMockApi
    ? inject(MockAuthenticatedContextRepository)
    : inject(HttpAuthenticatedContextRepository);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: APP_ENVIRONMENT, useValue: environment },
    { provide: TOKEN_STORAGE, useClass: WebTokenStorage },
    HttpAuthRepository,
    MockAuthRepository,
    HttpAuthenticatedContextRepository,
    MockAuthenticatedContextRepository,
    HttpTenantRepository,
    MockTenantRepository,
    HttpTranslationRepository,
    MockTranslationRepository,
    { provide: AUTH_REPOSITORY, useFactory: authRepositoryFactory },
    {
      provide: AUTHENTICATED_CONTEXT_REPOSITORY,
      useFactory: authenticatedContextRepositoryFactory,
    },
    { provide: TENANT_REPOSITORY, useFactory: tenantRepositoryFactory },
    { provide: TRANSLATION_REPOSITORY, useFactory: translationRepositoryFactory },
    provideAppInitializer(() => inject(LocalizationService).initialize()),
  ],
};
