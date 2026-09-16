import { Routes } from '@angular/router';
import { HttpProductRepository } from './data-access/http-product.repository';
import { ProductStore } from './data-access/product-store.service';
import { PRODUCT_REPOSITORY } from './data-access/product.repository';
import { productReadGuard } from './guards/product-permission.guard';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpProductRepository,
      ProductStore,
      { provide: PRODUCT_REPOSITORY, useExisting: HttpProductRepository },
    ],
    canActivate: [productReadGuard],
    loadComponent: () =>
      import('./product-page/product-page.component').then(
        (component) => component.ProductPageComponent,
      ),
  },
];
