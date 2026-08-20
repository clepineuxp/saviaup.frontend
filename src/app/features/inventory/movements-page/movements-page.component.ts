import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { InventoryStore } from '../data-access/inventory-store.service';
import { MovementFormComponent } from '../movement-form/movement-form.component';
import {
  CreateInventoryMovementRequest,
  InventoryMovementDirection,
  InventoryMovementQuery,
} from '../models/inventory.model';
import { InventoryPaginationComponent } from '../shared/inventory-pagination.component';

@Component({
  selector: 'app-movements-page',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MovementFormComponent,
    InventoryPaginationComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './movements-page.component.html',
  styleUrl: './movements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsPageComponent implements OnInit {
  readonly store = inject(InventoryStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly formOpen = signal(false);
  readonly success = signal(false);
  readonly canManage = computed(() => this.store.hasPermission('inventory.movements.manage'));
  readonly canSelectIngredients = computed(() =>
    this.store.hasPermission('inventory.ingredients.read'),
  );
  readonly filters = this.formBuilder.nonNullable.group({
    ingredientId: [''],
    direction: ['' as '' | InventoryMovementDirection],
  });

  ngOnInit(): void {
    this.load(1);
    this.store
      .loadActiveIngredients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  applyFilters(): void {
    this.load(1);
  }
  changePage(page: number): void {
    this.load(page);
  }
  retry(): void {
    this.load(this.store.movementsPage().page);
  }

  openForm(): void {
    if (!this.canManage() || !this.canSelectIngredients()) return;
    this.store.clearOperationError();
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.store.mutating()) {
      this.formOpen.set(false);
      this.store.clearOperationError();
    }
  }

  save(request: CreateInventoryMovementRequest): void {
    this.store
      .createMovement(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.success.set(true);
        },
        error: () => undefined,
      });
  }

  private load(page: number): void {
    const value = this.filters.getRawValue();
    const query: InventoryMovementQuery = {
      page,
      pageSize: 20,
      ingredientId: value.ingredientId || null,
      direction: value.direction || null,
    };
    this.store
      .loadMovements(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
