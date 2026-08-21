import { Routes } from '@angular/router';
import { HttpTableRepository } from './data-access/http-table.repository';
import { TableRealtimeClient } from './data-access/table-realtime.client';
import { TableStore } from './data-access/table-store.service';
import { TABLE_REPOSITORY } from './data-access/table.repository';
import { tableManageGuard, tableReadGuard } from './guards/table-permission.guard';
import { HttpProductRepository } from '../products/data-access/http-product.repository';
import { PRODUCT_REPOSITORY } from '../products/data-access/product.repository';
import { HttpSettingsRepository } from '../settings/data-access/http-settings.repository';
import { SettingsStore } from '../settings/data-access/settings-store.service';
import { SETTINGS_REPOSITORY } from '../settings/data-access/settings.repository';

const providers = [
  HttpTableRepository,
  TableRealtimeClient,
  TableStore,
  { provide: TABLE_REPOSITORY, useExisting: HttpTableRepository },
  HttpProductRepository,
  { provide: PRODUCT_REPOSITORY, useExisting: HttpProductRepository },
  HttpSettingsRepository,
  SettingsStore,
  { provide: SETTINGS_REPOSITORY, useExisting: HttpSettingsRepository },
];

export const TABLE_OPERATION_ROUTES: Routes = [
  {
    path: '',
    providers,
    canActivate: [tableReadGuard],
    loadComponent: () =>
      import('./table-operation-page/table-operation-page.component').then(
        (component) => component.TableOperationPageComponent,
      ),
  },
];

export const TABLE_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    providers,
    canActivate: [tableManageGuard],
    loadComponent: () =>
      import('./table-management-page/table-management-page.component').then(
        (component) => component.TableManagementPageComponent,
      ),
  },
];
