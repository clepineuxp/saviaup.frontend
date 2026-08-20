import { DecimalPipe } from '@angular/common';
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
import { IngredientFormComponent } from '../ingredient-form/ingredient-form.component';
import { InventoryStore } from '../data-access/inventory-store.service';
import {
  CreateIngredientRequest,
  Ingredient,
  IngredientQuery,
  UpdateIngredientRequest,
} from '../models/inventory.model';
import { InventoryDeleteDialogComponent } from '../shared/inventory-delete-dialog.component';
import { InventoryPaginationComponent } from '../shared/inventory-pagination.component';

@Component({
  selector: 'app-ingredients-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    IngredientFormComponent,
    InventoryDeleteDialogComponent,
    InventoryPaginationComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './ingredients-page.component.html',
  styleUrl: './ingredients-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientsPageComponent implements OnInit {
  readonly store = inject(InventoryStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly formOpen = signal(false);
  readonly editingIngredient = signal<Ingredient | null>(null);
  readonly deleteTarget = signal<Ingredient | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly canManage = computed(() => this.store.hasPermission('inventory.ingredients.manage'));
  readonly canUseForm = computed(
    () =>
      this.canManage() &&
      this.store.hasPermission('categories.read') &&
      this.store.hasPermission('inventory.complements.read'),
  );
  readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    categoryId: [''],
    includeInactive: [false],
  });

  ngOnInit(): void {
    this.load(1);
    this.store
      .loadIngredientLookups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  applyFilters(): void {
    this.load(1);
  }

  changePage(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    if (!this.canUseForm()) return;
    this.store.clearOperationError();
    this.editingIngredient.set(null);
    this.formOpen.set(true);
  }

  openEdit(ingredient: Ingredient): void {
    if (!this.canUseForm()) return;
    this.store.clearOperationError();
    this.editingIngredient.set(ingredient);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.store.mutating()) return;
    this.formOpen.set(false);
    this.editingIngredient.set(null);
    this.store.clearOperationError();
  }

  save(request: CreateIngredientRequest | UpdateIngredientRequest): void {
    const editing = this.editingIngredient();
    const operation = editing
      ? this.store.updateIngredient(editing.id, request as UpdateIngredientRequest)
      : this.store.createIngredient(request as CreateIngredientRequest);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingIngredient.set(null);
        this.successKey.set(
          editing
            ? 'inventory.ingredients.success.updated'
            : 'inventory.ingredients.success.created',
        );
      },
      error: () => undefined,
    });
  }

  toggleStatus(ingredient: Ingredient): void {
    if (!this.canManage()) return;
    this.store
      .setIngredientStatus(ingredient.id, { isActive: !ingredient.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.successKey.set(
            ingredient.isActive
              ? 'inventory.ingredients.success.disabled'
              : 'inventory.ingredients.success.enabled',
          ),
        error: () => undefined,
      });
  }

  requestDelete(ingredient: Ingredient): void {
    if (!this.canManage()) return;
    this.store.clearOperationError();
    this.deleteTarget.set(ingredient);
  }

  confirmDelete(): void {
    const ingredient = this.deleteTarget();
    if (!ingredient) return;
    this.store
      .deleteIngredient(ingredient.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successKey.set('inventory.ingredients.success.deleted');
        },
        error: () => undefined,
      });
  }

  deactivateInstead(): void {
    const ingredient = this.deleteTarget();
    if (!ingredient) return;
    this.store
      .setIngredientStatus(ingredient.id, { isActive: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successKey.set('inventory.ingredients.success.disabled');
        },
        error: () => undefined,
      });
  }

  cancelDelete(): void {
    if (!this.store.mutating()) {
      this.deleteTarget.set(null);
      this.store.clearOperationError();
    }
  }

  retry(): void {
    this.load(this.store.ingredientsPage().page);
  }

  private load(page: number): void {
    const value = this.filters.getRawValue();
    const query: IngredientQuery = {
      page,
      pageSize: 20,
      search: value.search.trim() || null,
      categoryId: value.categoryId || null,
      includeInactive: value.includeInactive,
    };
    this.store
      .loadIngredients(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
