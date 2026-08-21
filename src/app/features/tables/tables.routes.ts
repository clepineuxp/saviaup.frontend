import { Routes } from '@angular/router';
import { HttpTableRepository } from './data-access/http-table.repository';
import { TableRealtimeClient } from './data-access/table-realtime.client';
import { TableStore } from './data-access/table-store.service';
import { TABLE_REPOSITORY } from './data-access/table.repository';
import { tableManageGuard, tableReadGuard } from './guards/table-permission.guard';

const providers = [
  HttpTableRepository,
  TableRealtimeClient,
  TableStore,
  { provide: TABLE_REPOSITORY, useExisting: HttpTableRepository },
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
