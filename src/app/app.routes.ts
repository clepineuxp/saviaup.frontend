import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantGuard } from './core/guards/tenant.guard';
import { KNOWN_MODULE_NAVIGATION } from './features/app/navigation/module-navigation.config';

const modulePlaceholder = () =>
  import('./features/app/module-placeholder/module-placeholder.component').then(
    (component) => component.ModulePlaceholderComponent,
  );

const knownModuleRoutes: Routes = KNOWN_MODULE_NAVIGATION.filter(
  ({ code }) => code !== 'categories' && code !== 'inventory',
).map(({ code, path }) => ({
  path,
  title: 'Savia Up',
  data: { moduleCode: code },
  loadComponent: modulePlaceholder,
}));

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
      {
        path: 'categories',
        title: 'Categorías · Savia Up',
        loadChildren: () =>
          import('./features/categories/categories.routes').then(
            (routesFile) => routesFile.CATEGORY_ROUTES,
          ),
      },
      {
        path: 'inventory',
        title: 'Inventario · Savia Up',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (routesFile) => routesFile.INVENTORY_ROUTES,
          ),
      },
      ...knownModuleRoutes,
      {
        path: 'modules/:code',
        title: 'Savia Up',
        loadComponent: modulePlaceholder,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
