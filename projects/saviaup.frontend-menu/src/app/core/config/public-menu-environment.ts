import { InjectionToken } from '@angular/core';

export interface PublicMenuEnvironment {
  readonly apiUrl: string;
}

export const PUBLIC_MENU_ENVIRONMENT = new InjectionToken<PublicMenuEnvironment>(
  'PUBLIC_MENU_ENVIRONMENT',
);
