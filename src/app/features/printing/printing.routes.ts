import { Routes } from '@angular/router';
import { HttpPrintingRepository } from './data-access/http-printing.repository';
import { PRINTING_REPOSITORY } from './data-access/printing.repository';
import { PrintingStore } from './data-access/printing-store.service';
import { printingPermissionGuard } from './guards/printing-permission.guard';

export const PRINTING_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpPrintingRepository,
      PrintingStore,
      { provide: PRINTING_REPOSITORY, useExisting: HttpPrintingRepository },
    ],
    canActivate: [printingPermissionGuard],
    loadComponent: () =>
      import('./printing-page/printing-page.component').then(
        (component) => component.PrintingPageComponent,
      ),
  },
];
