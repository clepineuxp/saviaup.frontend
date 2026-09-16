import { Routes } from '@angular/router';
import { CategoryStore } from './data-access/category-store.service';
import { CATEGORY_REPOSITORY, CategoryRepository } from './data-access/category.repository';
import { HttpCategoryRepository } from './data-access/http-category.repository';

const categoryRepositoryFactory = (repository: HttpCategoryRepository): CategoryRepository =>
  repository;

export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpCategoryRepository,
      CategoryStore,
      {
        provide: CATEGORY_REPOSITORY,
        useFactory: categoryRepositoryFactory,
        deps: [HttpCategoryRepository],
      },
    ],
    loadComponent: () =>
      import('./category-page/category-page.component').then(
        (component) => component.CategoryPageComponent,
      ),
  },
];
