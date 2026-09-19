import { Routes } from '@angular/router';
import {
  digitalMenuAccessGuard,
  digitalMenuItemsGuard,
  digitalMenuStyleGuard,
} from './guards/digital-menu-permission.guard';

export const DIGITAL_MENU_ROUTES: Routes = [
  {
    path: '',
    canActivate: [digitalMenuAccessGuard],
    loadComponent: () =>
      import('./admin/digital-menu-shell/digital-menu-shell.component').then(
        (m) => m.DigitalMenuShellComponent,
      ),
    children: [
      {
        path: 'products',
        canActivate: [digitalMenuItemsGuard],
        title: 'Administrar menú · Productos · Savia Up',
        loadComponent: () =>
          import(
            './admin/digital-menu-products-page/digital-menu-products-page.component'
          ).then((m) => m.DigitalMenuProductsPageComponent),
      },
      {
        path: 'style',
        canActivate: [digitalMenuStyleGuard],
        title: 'Administrar menú · Estilo · Savia Up',
        loadComponent: () =>
          import('./admin/digital-menu-style-page/digital-menu-style-page.component').then(
            (m) => m.DigitalMenuStylePageComponent,
          ),
      },
    ],
  },
];
