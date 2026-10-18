import { Routes } from '@angular/router';
import { HttpPromotionRepository } from './data-access/http-promotion.repository';
import { PROMOTION_REPOSITORY } from './data-access/promotion.repository';
import { PromotionStore } from './data-access/promotion-store.service';

export const PROMOTION_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpPromotionRepository,
      PromotionStore,
      { provide: PROMOTION_REPOSITORY, useExisting: HttpPromotionRepository },
    ],
    loadComponent: () =>
      import('./promotion-page/promotion-page.component').then(
        (component) => component.PromotionPageComponent,
      ),
  },
];
