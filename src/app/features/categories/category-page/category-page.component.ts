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
import { FormsModule } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CategoryCardComponent } from '../category-card/category-card.component';
import { CategoryDeleteDialogComponent } from '../category-delete-dialog/category-delete-dialog.component';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { CategoryStore } from '../data-access/category-store.service';
import { Category, CreateCategoryRequest } from '../models/category.model';

type CategoryFilter = 'all' | 'active' | 'inactive' | 'inventory' | 'non-inventory';

interface FilterOption {
  readonly value: CategoryFilter;
  readonly label: string;
}

@Component({
  selector: 'app-category-page',
  imports: [
    FormsModule,
    CategoryCardComponent,
    CategoryDeleteDialogComponent,
    CategoryFormComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPageComponent implements OnInit {
  readonly store = inject(CategoryStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly search = signal('');
  readonly filter = signal<CategoryFilter>('all');
  readonly formOpen = signal(false);
  readonly editingCategory = signal<Category | null>(null);
  readonly deleteTarget = signal<Category | null>(null);
  readonly successMessageKey = signal<string | null>(null);
  readonly filters: readonly FilterOption[] = [
    { value: 'all', label: 'categories.filter.all' },
    { value: 'active', label: 'categories.filter.active' },
    { value: 'inactive', label: 'categories.filter.inactive' },
    { value: 'inventory', label: 'categories.filter.inventory' },
    { value: 'non-inventory', label: 'categories.filter.nonInventory' },
  ];
  readonly filteredCategories = computed(() => {
    const query = this.normalize(this.search());
    const filter = this.filter();
    return this.store.categories().filter((category) => {
      const matchesSearch = !query || this.normalize(category.name).includes(query);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && category.isActive) ||
        (filter === 'inactive' && !category.isActive) ||
        (filter === 'inventory' && category.isInventoryTracked) ||
        (filter === 'non-inventory' && !category.isInventoryTracked);
      return matchesSearch && matchesFilter;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.store
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  selectFilter(filter: CategoryFilter): void {
    this.filter.set(filter);
  }

  clearFilters(): void {
    this.search.set('');
    this.filter.set('all');
  }

  openCreate(): void {
    if (!this.store.canManage()) return;
    this.store.clearOperationError();
    this.editingCategory.set(null);
    this.formOpen.set(true);
  }

  openEdit(category: Category): void {
    if (!this.store.canManage()) return;
    this.store.clearOperationError();
    this.editingCategory.set(category);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.store.mutating()) return;
    this.formOpen.set(false);
    this.editingCategory.set(null);
    this.store.clearOperationError();
  }

  save(request: CreateCategoryRequest): void {
    const editing = this.editingCategory();
    const operation = editing ? this.store.update(editing.id, request) : this.store.create(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingCategory.set(null);
        this.successMessageKey.set(
          editing ? 'categories.success.updated' : 'categories.success.created',
        );
      },
      error: () => undefined,
    });
  }

  toggleStatus(category: Category): void {
    if (!this.store.canManage() || this.store.mutating()) return;
    this.successMessageKey.set(null);
    this.store
      .setStatus(category.id, { isActive: !category.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.successMessageKey.set(
            category.isActive ? 'categories.success.disabled' : 'categories.success.reactivated',
          ),
        error: () => undefined,
      });
  }

  requestDelete(category: Category): void {
    if (!this.store.canManage()) return;
    this.store.clearOperationError();
    this.deleteTarget.set(category);
  }

  cancelDelete(): void {
    if (!this.store.mutating()) this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const category = this.deleteTarget();
    if (!category || !this.store.canManage()) return;
    this.store
      .delete(category.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successMessageKey.set('categories.success.deleted');
        },
        error: () => undefined,
      });
  }

  private normalize(value: string): string {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  }
}
