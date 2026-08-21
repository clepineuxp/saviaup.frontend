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
import { ProductStore } from '../data-access/product-store.service';
import { CreateProductRequest, Product, ProductQuery, ProductType } from '../models/product.model';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductDeleteDialogComponent } from '../shared/product-delete-dialog.component';
import { ProductPaginationComponent } from '../shared/product-pagination.component';

@Component({
  selector: 'app-product-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    ProductFormComponent,
    ProductDeleteDialogComponent,
    ProductPaginationComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent implements OnInit {
  readonly store = inject(ProductStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly formOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);
  readonly deleteTarget = signal<Product | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly canManage = computed(() => this.store.hasPermission('products.manage'));
  readonly canUseForm = computed(
    () => this.canManage() && this.store.hasPermission('categories.read'),
  );
  readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    categoryId: [''],
    type: ['' as '' | ProductType],
    includeInactive: [false],
  });

  ngOnInit(): void {
    this.load(1);
    this.store
      .loadCategories()
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
    this.editingProduct.set(null);
    this.formOpen.set(true);
  }

  openEdit(product: Product): void {
    if (!this.canUseForm()) return;
    this.store.clearOperationError();
    this.editingProduct.set(product);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.store.mutating()) return;
    this.formOpen.set(false);
    this.editingProduct.set(null);
    this.store.clearOperationError();
  }

  save(request: CreateProductRequest): void {
    const editing = this.editingProduct();
    const operation = editing ? this.store.update(editing.id, request) : this.store.create(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingProduct.set(null);
        this.successKey.set(editing ? 'products.success.updated' : 'products.success.created');
      },
      error: () => undefined,
    });
  }

  toggleStatus(product: Product): void {
    if (!this.canManage() || this.store.mutating()) return;
    this.successKey.set(null);
    this.store
      .setStatus(product.id, { isActive: !product.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.successKey.set(
            product.isActive ? 'products.success.disabled' : 'products.success.enabled',
          ),
        error: () => undefined,
      });
  }

  requestDelete(product: Product): void {
    if (!this.canManage()) return;
    this.store.clearOperationError();
    this.deleteTarget.set(product);
  }

  cancelDelete(): void {
    if (this.store.mutating()) return;
    this.deleteTarget.set(null);
    this.store.clearOperationError();
  }

  confirmDelete(): void {
    const product = this.deleteTarget();
    if (!product || !this.canManage()) return;
    this.store
      .delete(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successKey.set('products.success.deleted');
        },
        error: () => undefined,
      });
  }

  retry(): void {
    this.load(this.store.page().page);
  }

  hideBrokenImage(event: Event): void {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }

  private load(page: number): void {
    const value = this.filters.getRawValue();
    const query: ProductQuery = {
      page,
      pageSize: 20,
      search: value.search.trim() || null,
      categoryId: value.categoryId || null,
      type: value.type || null,
      includeInactive: value.includeInactive,
    };
    this.store
      .load(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
