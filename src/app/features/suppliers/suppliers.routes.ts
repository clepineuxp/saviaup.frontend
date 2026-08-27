import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./suppliers-page/suppliers-page.component').then(
        (m) => m.SuppliersPageComponent
      ),
  },
];
