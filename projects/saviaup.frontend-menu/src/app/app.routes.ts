import { Route, Routes } from '@angular/router';

const publicMenuRoute = (path: string): Route => ({
  path,
  loadComponent: () =>
    import('../../../../src/app/layouts/digital-menu-layout/digital-menu-layout.component').then(
      (component) => component.DigitalMenuLayoutComponent,
    ),
  children: [
    {
      path: '',
      loadComponent: () =>
        import('../../../../src/app/features/digital-menu/public-menu/public-menu.component').then(
          (component) => component.PublicMenuComponent,
        ),
    },
  ],
});

export const menuRoutes: Routes = [
  publicMenuRoute('m/:slug'),
  publicMenuRoute(':slug'),
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/menu-not-found.component').then(
        (component) => component.MenuNotFoundComponent,
      ),
  },
];
