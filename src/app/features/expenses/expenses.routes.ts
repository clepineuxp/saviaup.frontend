import { Routes } from '@angular/router';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./expenses-page/expenses-page.component').then(
        (m) => m.ExpensesPageComponent
      ),
  },
];
