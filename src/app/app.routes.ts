import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantGuard } from './core/guards/tenant.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((routesFile) => routesFile.AUTH_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/tenant/tenant.routes').then((routesFile) => routesFile.TENANT_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard, tenantGuard],
    loadComponent: () =>
      import('./layouts/app-layout/app-layout.component').then(
        (component) => component.AppLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: 'Savia Up',
        loadComponent: () =>
          import('./features/app/placeholder/app-placeholder.component').then(
            (component) => component.AppPlaceholderComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
