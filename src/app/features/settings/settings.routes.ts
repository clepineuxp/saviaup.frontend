import { Routes } from '@angular/router';
import { HttpSettingsRepository } from './data-access/http-settings.repository';
import { SettingsStore } from './data-access/settings-store.service';
import { SETTINGS_REPOSITORY } from './data-access/settings.repository';
import { settingsPermissionGuard } from './guards/settings-permission.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [settingsPermissionGuard],
    providers: [
      HttpSettingsRepository,
      SettingsStore,
      { provide: SETTINGS_REPOSITORY, useExisting: HttpSettingsRepository },
    ],
    loadComponent: () =>
      import('./settings-page/settings-page.component').then(
        (component) => component.SettingsPageComponent,
      ),
  },
];
