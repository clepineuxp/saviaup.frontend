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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TableSalesCatalogCache } from '../../tables/data-access/table-sales-catalog-cache.service';
import { Product, ProductCategory } from '../../products/models/product.model';
import {
  Promotion,
  PromotionTargetRequest,
  PromotionTargetType,
  SavePromotionRequest,
} from '../models/promotion.model';
import { PromotionStore } from '../data-access/promotion-store.service';

@Component({
  selector: 'app-promotion-page',
  imports: [ReactiveFormsModule, TranslatePipe, UiAlertComponent, UiButtonComponent],
  templateUrl: './promotion-page.component.html',
  styleUrl: './promotion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionPageComponent implements OnInit {
  readonly store = inject(PromotionStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = inject(TableSalesCatalogCache);
  readonly products = signal<readonly Product[]>([]);
  readonly categories = signal<readonly ProductCategory[]>([]);
  readonly formOpen = signal(false);
  readonly editing = signal<Promotion | null>(null);
  readonly targetType = signal<PromotionTargetType>('MENU');
  readonly targetProductId = signal('');
  readonly targetVariationId = signal('');
  readonly targets = signal<readonly PromotionTargetRequest[]>([]);
  readonly search = signal('');
  readonly showInactive = signal(true);
  readonly weekDays = [
    { label: 'D', value: 1 },
    { label: 'L', value: 2 },
    { label: 'M', value: 4 },
    { label: 'X', value: 8 },
    { label: 'J', value: 16 },
    { label: 'V', value: 32 },
    { label: 'S', value: 64 },
  ] as const;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(1000)],
    type: ['GENERAL', Validators.required],
    valueType: ['PERCENTAGE', Validators.required],
    value: [0, [Validators.required, Validators.min(0.01)]],
    requiredQuantity: [2, [Validators.min(2)]],
    discountedQuantity: [1, [Validators.min(1)]],
    startTime: [''],
    endTime: [''],
    specificDate: [''],
    monthOfYear: [null as number | null],
    weekDaysMask: [0, [Validators.min(0), Validators.max(127)]],
    isActive: [true],
  });

  readonly filteredItems = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.store
      .items()
      .filter(
        (item) =>
          (this.showInactive() || item.isActive) &&
          (!query || item.name.toLocaleLowerCase().includes(query)),
      );
  });

  readonly selectedProduct = computed(
    () => this.products().find((item) => item.id === this.targetProductId()) ?? null,
  );
  readonly targetLabel = (target: PromotionTargetRequest): string => {
    if (target.targetType === 'MENU') return 'Toda la carta';
    if (target.targetType === 'CATEGORY')
      return this.categories().find((item) => item.id === target.categoryId)?.name ?? 'Categoría';
    const product = this.products().find((item) => item.id === target.productId);
    if (target.targetType === 'VARIATION') {
      const variation = product?.variations.find((item) => item.id === target.productVariationId);
      return `${product?.name ?? 'Producto'} · ${variation?.name ?? 'Variante'}`;
    }
    return product?.name ?? 'Producto';
  };

  ngOnInit(): void {
    this.store.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.catalog
      .listProducts({
        page: 1,
        pageSize: 100,
        search: null,
        categoryId: null,
        type: null,
        includeInactive: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => this.products.set(page.items));
    this.catalog
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => this.categories.set(items));
  }

  openCreate(): void {
    if (!this.store.canManage()) return;
    this.editing.set(null);
    this.targets.set([{ targetType: 'MENU' }]);
    this.form.reset({
      name: '',
      description: '',
      type: 'GENERAL',
      valueType: 'PERCENTAGE',
      value: 0,
      requiredQuantity: 2,
      discountedQuantity: 1,
      startTime: '',
      endTime: '',
      specificDate: '',
      monthOfYear: null,
      weekDaysMask: 0,
      isActive: true,
    });
    this.formOpen.set(true);
  }

  openEdit(item: Promotion): void {
    if (!this.store.canManage()) return;
    this.editing.set(item);
    this.targets.set(
      item.targets.map((target) => ({
        targetType: target.targetType,
        productId: target.productId,
        productVariationId: target.productVariationId,
        categoryId: target.categoryId,
      })),
    );
    this.form.reset({
      name: item.name,
      description: item.description ?? '',
      type: item.type,
      valueType: item.valueType,
      value: item.value,
      requiredQuantity: item.requiredQuantity ?? 2,
      discountedQuantity: item.discountedQuantity ?? 1,
      startTime: item.startTime?.slice(0, 5) ?? '',
      endTime: item.endTime?.slice(0, 5) ?? '',
      specificDate: item.specificDate ?? '',
      monthOfYear: item.monthOfYear,
      weekDaysMask: item.weekDaysMask,
      isActive: item.isActive,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  addTarget(): void {
    const type = this.targetType();
    if (type === 'MENU') {
      this.targets.set([{ targetType: 'MENU' }]);
    } else if (type === 'PRODUCT' && this.targetProductId()) {
      this.targets.update((items) => [
        ...items.filter((item) => item.targetType !== 'MENU'),
        { targetType: type, productId: this.targetProductId() },
      ]);
    } else if (type === 'VARIATION' && this.targetProductId() && this.targetVariationId()) {
      this.targets.update((items) => [
        ...items.filter((item) => item.targetType !== 'MENU'),
        {
          targetType: type,
          productId: this.targetProductId(),
          productVariationId: this.targetVariationId(),
        },
      ]);
    } else if (type === 'CATEGORY' && this.targetProductId()) {
      this.targets.update((items) => [
        ...items.filter((item) => item.targetType !== 'MENU'),
        { targetType: type, categoryId: this.targetProductId() },
      ]);
    }
  }

  removeTarget(index: number): void {
    this.targets.update((items) => items.filter((_, current) => current !== index));
  }

  toggleWeekDay(value: number): void {
    const current = Number(this.form.controls.weekDaysMask.value ?? 0);
    this.form.controls.weekDaysMask.setValue(
      (current & value) === value ? current - value : current + value,
    );
  }

  weekDaySelected(value: number): boolean {
    return (Number(this.form.controls.weekDaysMask.value ?? 0) & value) === value;
  }

  save(): void {
    if (this.form.invalid || this.targets().length === 0 || !this.store.canManage()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const request: SavePromotionRequest = {
      name: (raw.name ?? '').trim(),
      description: raw.description?.trim() || null,
      type: raw.type as SavePromotionRequest['type'],
      valueType: raw.valueType as SavePromotionRequest['valueType'],
      value: Number(raw.value),
      requiredQuantity: raw.type === 'QUANTITY' ? Number(raw.requiredQuantity) : null,
      discountedQuantity: raw.type === 'QUANTITY' ? Number(raw.discountedQuantity) : null,
      startTime: raw.startTime ? `${raw.startTime}:00` : null,
      endTime: raw.endTime ? `${raw.endTime}:00` : null,
      specificDate: raw.specificDate || null,
      monthOfYear: raw.monthOfYear ? Number(raw.monthOfYear) : null,
      weekDaysMask: Number(raw.weekDaysMask ?? 0),
      targets: this.targets(),
      isActive: Boolean(raw.isActive),
    };
    const current = this.editing();
    const operation = current ? this.store.update(current.id, request) : this.store.create(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.closeForm() });
  }

  toggleStatus(item: Promotion): void {
    if (this.store.canManage()) this.store.setStatus(item.id, !item.isActive).subscribe();
  }
  delete(item: Promotion): void {
    if (this.store.canManage() && confirm(`¿Eliminar "${item.name}"?`))
      this.store.delete(item.id).subscribe();
  }
  formatTargets(item: Promotion): string {
    return item.targets
      .map(
        (target) =>
          target.productName ??
          target.productVariationName ??
          target.categoryName ??
          'Toda la carta',
      )
      .join(', ');
  }
  valueLabel(item: Promotion): string {
    return item.valueType === 'PERCENTAGE'
      ? `${item.value}%`
      : item.value.toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        });
  }
}
