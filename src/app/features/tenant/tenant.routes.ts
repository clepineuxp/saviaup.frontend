import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const TENANT_ROUTES: Routes = [
  {
    path: '',
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('../../layouts/tenant-layout/tenant-layout.component').then(
        (component) => component.TenantLayoutComponent,
      ),
    children: [
      {
        path: 'select-tenant',
        title: 'Elegir organización · Savia Up',
        loadComponent: () =>
          import('./tenant-selection/tenant-selection.component').then(
            (component) => component.TenantSelectionComponent,
          ),
      },
      {
        path: 'create-tenant',
        title: 'Crear organización · Savia Up',
        loadComponent: () =>
          import('./tenant-create/tenant-create.component').then(
            (component) => component.TenantCreateComponent,
          ),
      },
    ],
  },
];
