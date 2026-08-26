import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantGuard } from './core/guards/tenant.guard';
import { KNOWN_MODULE_NAVIGATION } from './features/app/navigation/module-navigation.config';

const modulePlaceholder = () =>
  import('./features/app/module-placeholder/module-placeholder.component').then(
    (component) => component.ModulePlaceholderComponent,
  );

const knownModuleRoutes: Routes = KNOWN_MODULE_NAVIGATION.filter(
  ({ code }) =>
    code !== 'categories' &&
    code !== 'inventory' &&
    code !== 'products' &&
    code !== 'tables' &&
    code !== 'orders' &&
    code !== 'settings' &&
    code !== 'statistics' &&
    code !== 'reports' &&
    code !== 'billing',
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
        path: 'orders',
        title: 'Comandas · Savia Up',
        loadComponent: () =>
          import('./features/orders/order-list-page/order-list-page.component').then(
            (c) => c.OrderListPageComponent,
          ),
      },
      {
        path: 'sell/tables',
        title: 'Mesas · Savia Up',
        loadChildren: () =>
          import('./features/tables/tables.routes').then(
            (routesFile) => routesFile.TABLE_OPERATION_ROUTES,
          ),
      },
      {
        path: 'configuration/tables/manage',
        title: 'Administrar mesas · Savia Up',
        loadChildren: () =>
          import('./features/tables/tables.routes').then(
            (routesFile) => routesFile.TABLE_MANAGEMENT_ROUTES,
          ),
      },
      {
        path: 'configuration/cash-registers/manage',
        title: 'Administrar cajas · Savia Up',
        canActivate: [
          () =>
            import('./features/cash-registers/guards/cash-register-permission.guard').then(
              (m) => m.cashRegisterPermissionGuard,
            ),
        ],
        loadComponent: () =>
          import('./features/cash-registers/cash-register-management-page/cash-register-management-page.component').then(
            (m) => m.CashRegisterManagementPageComponent,
          ),
      },
      {
        path: 'cash-registers',
        title: 'Manejo de cajas · Savia Up',
        canActivate: [
          () =>
            import('./features/cash-registers/guards/cash-register-permission.guard').then(
              (m) => m.cashRegisterPermissionGuard,
            ),
        ],
        loadComponent: () =>
          import(
            './features/cash-registers/cash-register-page/cash-register-page.component'
          ).then((m) => m.CashRegisterPageComponent),
      },
      {
        path: 'products',
        title: 'Productos · Savia Up',
        loadChildren: () =>
          import('./features/products/products.routes').then(
            (routesFile) => routesFile.PRODUCT_ROUTES,
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
        path: 'settings',
        title: 'Configuración · Savia Up',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (routesFile) => routesFile.SETTINGS_ROUTES,
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
      {
        path: 'statistics',
        title: 'Estadísticas · Savia Up',
        loadComponent: () =>
          import('./features/statistics/statistics-page/statistics-page.component').then(
            (c) => c.StatisticsPageComponent,
          ),
      },
      {
        path: 'reports',
        pathMatch: 'full',
        redirectTo: 'statistics',
      },
      {
        path: 'billing',
        title: 'Facturación · Savia Up',
        loadComponent: () =>
          import('./features/billing/billing-page/billing-page.component').then(
            (c) => c.BillingPageComponent,
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
  {
    path: 'configuration/tables/manage',
    pathMatch: 'full',
    redirectTo: 'app/configuration/tables/manage',
  },
  {
    path: 'configuration/cash-registers/manage',
    pathMatch: 'full',
    redirectTo: 'app/configuration/cash-registers/manage',
  },
  {
    path: 'cash-registers',
    pathMatch: 'full',
    redirectTo: 'app/cash-registers',
  },
  { path: '**', redirectTo: '' },
];
