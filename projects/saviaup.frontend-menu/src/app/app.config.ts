import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { environment } from '../environments/environment';
import { menuRoutes } from './app.routes';
import { PUBLIC_MENU_ENVIRONMENT } from './core/config/public-menu-environment';

export const menuAppConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(menuRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
    { provide: PUBLIC_MENU_ENVIRONMENT, useValue: environment },
  ],
};
