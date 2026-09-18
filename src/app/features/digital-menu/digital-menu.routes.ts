import { Routes } from '@angular/router';

export const DIGITAL_MENU_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin/digital-menu-shell/digital-menu-shell.component').then(
        (m) => m.DigitalMenuShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'products',
      },
      {
        path: 'products',
        title: 'Administrar menú · Productos · Savia Up',
        loadComponent: () =>
          import(
            './admin/digital-menu-products-page/digital-menu-products-page.component'
          ).then((m) => m.DigitalMenuProductsPageComponent),
      },
      {
        path: 'style',
        title: 'Administrar menú · Estilo · Savia Up',
        loadComponent: () =>
          import('./admin/digital-menu-style-page/digital-menu-style-page.component').then(
            (m) => m.DigitalMenuStylePageComponent,
          ),
      },
    ],
  },
];
