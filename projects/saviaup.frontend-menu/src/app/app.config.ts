import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { APP_ENVIRONMENT } from '../../../../src/app/core/config/app-environment';
import { environment } from '../environments/environment';
import { menuRoutes } from './app.routes';

export const menuAppConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(menuRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
    { provide: APP_ENVIRONMENT, useValue: environment },
  ],
};
