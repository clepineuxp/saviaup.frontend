import { Routes } from '@angular/router';
import { HttpIngredientRepository } from './data-access/http-ingredient.repository';
import { HttpMeasurementUnitRepository } from './data-access/http-measurement-unit.repository';
import { HttpMovementRepository } from './data-access/http-movement.repository';
import { HttpStockRepository } from './data-access/http-stock.repository';
import { InventoryStore } from './data-access/inventory-store.service';
import {
  INGREDIENT_REPOSITORY,
  MEASUREMENT_UNIT_REPOSITORY,
  MOVEMENT_REPOSITORY,
  STOCK_REPOSITORY,
} from './data-access/inventory.repositories';
import { inventoryPermissionGuard } from './guards/inventory-permission.guard';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    providers: [
      HttpStockRepository,
      HttpIngredientRepository,
      HttpMovementRepository,
      HttpMeasurementUnitRepository,
      InventoryStore,
      { provide: STOCK_REPOSITORY, useExisting: HttpStockRepository },
      { provide: INGREDIENT_REPOSITORY, useExisting: HttpIngredientRepository },
      { provide: MOVEMENT_REPOSITORY, useExisting: HttpMovementRepository },
      { provide: MEASUREMENT_UNIT_REPOSITORY, useExisting: HttpMeasurementUnitRepository },
    ],
    loadComponent: () =>
      import('./inventory-shell/inventory-shell.component').then(
        (component) => component.InventoryShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./inventory-landing/inventory-landing.component').then(
            (component) => component.InventoryLandingComponent,
          ),
      },
      {
        path: 'stock',
        title: 'Existencias · Savia Up',
        canActivate: [inventoryPermissionGuard('inventory.stock.read')],
        loadComponent: () =>
          import('./stock-page/stock-page.component').then(
            (component) => component.StockPageComponent,
          ),
      },
      {
        path: 'ingredients',
        title: 'Ingredientes · Savia Up',
        canActivate: [inventoryPermissionGuard('inventory.ingredients.read')],
        loadComponent: () =>
          import('./ingredients-page/ingredients-page.component').then(
            (component) => component.IngredientsPageComponent,
          ),
      },
      {
        path: 'movements',
        title: 'Movimientos · Savia Up',
        canActivate: [inventoryPermissionGuard('inventory.movements.read')],
        loadComponent: () =>
          import('./movements-page/movements-page.component').then(
            (component) => component.MovementsPageComponent,
          ),
      },
      {
        path: 'complements/units',
        title: 'Unidades · Savia Up',
        canActivate: [inventoryPermissionGuard('inventory.complements.read')],
        loadComponent: () =>
          import('./units-page/units-page.component').then(
            (component) => component.UnitsPageComponent,
          ),
      },
    ],
  },
];
