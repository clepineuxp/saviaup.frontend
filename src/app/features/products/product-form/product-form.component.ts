import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import {
  ImageSelectorComponent,
  ImageSelectionResult,
} from '../../../shared/components/image-selector/image-selector.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import {
  imageUrlValidator,
  nonBlankRequiredValidator,
} from '../../../shared/utils/form-validators';
import { ProductFeatureError } from '../data-access/product-store.service';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  ProductComboGroupRequest,
  ProductComboSelectionType,
  ProductIngredientLookup,
  ProductRecipeItemRequest,
  ProductType,
  ProductVariationRequest,
} from '../models/product.model';

export interface RecipeRowItem {
  readonly id: string;
  isCustom: boolean;
  ingredientId: string;
  customIngredientName: string;
  quantity: number;
  notes: string;
}

export interface VariationRowItem {
  readonly id: string;
  name: string;
  salePrice: number;
}

export interface ComboOptionRowItem {
  readonly id: string;
  productId: string;
  productQuantity: number;
  priceAdjustment: number;
}

export interface ComboGroupRowItem {
  readonly id: string;
  name: string;
  selectionType: ProductComboSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ComboOptionRowItem[];
}

@Component({
  selector: 'app-product-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlertComponent,
    UiButtonComponent,
    ImageSelectorComponent,
    TranslatePipe,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = input<Product | null>(null);
  readonly categories = input.required<readonly ProductCategory[]>();
  readonly ingredients = input<readonly ProductIngredientLookup[]>([]);
  readonly comboProducts = input<readonly Product[]>([]);
  readonly submitting = input(false);
  readonly error = input<ProductFeatureError | null>(null);
  readonly submitted = output<CreateProductRequest>();
  readonly cancelled = output<void>();
  readonly statusRequested = output<Product>();
  readonly deleteRequested = output<Product>();
  readonly searchIngredients = output<string>();

  readonly activeTab = signal<'general' | 'variations' | 'recipe' | 'combo'>('general');
  readonly previewFailed = signal(false);
  readonly recipeRows = signal<RecipeRowItem[]>([]);
  readonly variationRows = signal<VariationRowItem[]>([]);
  readonly comboGroupRows = signal<ComboGroupRowItem[]>([]);
  readonly comboValidationError = signal(false);
  readonly availableComboProducts = computed(() =>
    this.comboProducts().filter((candidate) => candidate.id !== this.product()?.id),
  );

  readonly openSelectorIndex = signal<number | null>(null);
  readonly ingredientSearch = signal<string>('');
  readonly searchDebounced = signal<string>('');
  private readonly searchSubject = new Subject<string>();
  private readonly knownIngredients = new Map<string, ProductIngredientLookup>();

  readonly filteredIngredients = computed(() => {
    const list = this.ingredients();
    const term = this.searchDebounced().trim().toLowerCase();
    if (!term) return list.slice(0, 10);
    const matches = list.filter(
      (ing) =>
        ing.name.toLowerCase().includes(term) ||
        (ing.categoryName && ing.categoryName.toLowerCase().includes(term)),
    );
    return (matches.length > 0 ? matches : list).slice(0, 10);
  });

  readonly form = this.formBuilder.group({
    type: this.formBuilder.nonNullable.control<ProductType>('NORMAL', [Validators.required]),
    categoryId: this.formBuilder.nonNullable.control('', [Validators.required]),
    name: this.formBuilder.nonNullable.control('', [
      nonBlankRequiredValidator(),
      Validators.maxLength(120),
    ]),
    salePrice: this.formBuilder.nonNullable.control(0, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(99999999.99),
    ]),
    description: this.formBuilder.nonNullable.control('', [Validators.maxLength(1000)]),
    image: this.formBuilder.nonNullable.control('', [imageUrlValidator()]),
    preparationTimeMinutes: this.formBuilder.control<number | null>(null, [
      Validators.min(0),
      Validators.max(1440),
    ]),
    isInventoryTracked: this.formBuilder.nonNullable.control(false),
  });

  onImageSelected(result: ImageSelectionResult | null): void {
    this.form.controls.image.setValue(result?.base64Content || '');
  }

  private readonly categoryIdValue = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  private readonly typeValue = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  readonly isCombo = computed(() => this.typeValue() === 'COMBO');

  readonly selectedCategory = computed(() =>
    this.categories().find((category) => category.id === this.categoryIdValue()),
  );
  readonly inventoryDisabled = computed(
    () => this.isCombo() || !this.selectedCategory()?.isInventoryTracked,
  );

  constructor() {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchDebounced.set(term);
        this.searchIngredients.emit(term);
      });

    effect(() => {
      for (const ing of this.ingredients()) {
        this.knownIngredients.set(ing.id, ing);
      }
    });

    effect(() => {
      const product = this.product();
      this.form.reset({
        type: product?.type ?? 'NORMAL',
        categoryId: product?.category.id ?? '',
        name: product?.name ?? '',
        salePrice: product?.salePrice ?? 0,
        description: product?.description ?? '',
        image: product?.image ?? '',
        preparationTimeMinutes: product?.preparationTimeMinutes ?? null,
        isInventoryTracked: product?.isInventoryTracked ?? false,
      });

      if (product?.recipe && product.recipe.length > 0) {
        for (const item of product.recipe) {
          if (item.ingredientId && !this.knownIngredients.has(item.ingredientId)) {
            this.knownIngredients.set(item.ingredientId, {
              id: item.ingredientId,
              name: item.ingredientName || item.customIngredientName || '',
              categoryName: undefined,
              measurementUnit: {
                id: '',
                code: item.measurementUnitCode || '',
                name: item.measurementUnitName || '',
              },
              currentStock: 0,
              isActive: true,
            });
          }
        }

        this.recipeRows.set(
          product.recipe.map((r) => ({
            id: r.id || crypto.randomUUID(),
            isCustom: !r.ingredientId,
            ingredientId: r.ingredientId ?? '',
            customIngredientName: r.customIngredientName ?? r.ingredientName ?? '',
            quantity: r.quantity > 0 ? r.quantity : 1,
            notes: r.notes ?? '',
          })),
        );
      } else {
        this.recipeRows.set([]);
      }

      if (product?.variations && product.variations.length > 0) {
        this.variationRows.set(
          product.variations.map((v) => ({
            id: v.id,
            name: v.name,
            salePrice: v.salePrice,
          })),
        );
      } else {
        this.variationRows.set([]);
      }

      this.comboGroupRows.set(
        product?.comboGroups?.map((group) => ({
          id: group.id,
          name: group.name,
          selectionType: group.selectionType,
          isRequired: group.isRequired,
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
          options: group.options.map((option) => ({
            id: option.id,
            productId: option.productId,
            productQuantity: option.productQuantity,
            priceAdjustment: option.priceAdjustment,
          })),
        })) ?? [],
      );
      this.comboValidationError.set(false);

      this.activeTab.set('general');
      this.previewFailed.set(false);
      this.closeIngredientSelector();
    });

    effect(() => {
      const control = this.form.controls.isInventoryTracked;
      if (this.inventoryDisabled()) {
        control.setValue(false, { emitEvent: false });
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });

    effect(() => this.applyServerErrors(this.error()));

    effect(() => {
      if (this.isCombo() && (this.activeTab() === 'recipe' || this.activeTab() === 'variations')) {
        this.activeTab.set('combo');
      } else if (!this.isCombo() && this.activeTab() === 'combo') {
        this.activeTab.set('general');
      }
    });
  }

  setTab(tab: 'general' | 'variations' | 'recipe' | 'combo'): void {
    this.activeTab.set(tab);
  }

  addComboGroup(): void {
    this.comboGroupRows.update((groups) => [
      ...groups,
      {
        id: crypto.randomUUID(),
        name: '',
        selectionType: 'SINGLE',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        options: [],
      },
    ]);
  }

  updateComboGroup(index: number, patch: Partial<ComboGroupRowItem>): void {
    this.comboGroupRows.update((groups) =>
      groups.map((group, groupIndex) => {
        if (groupIndex !== index) return group;
        const updated = { ...group, ...patch };
        if (patch.selectionType === 'FIXED') {
          updated.isRequired = true;
          updated.minSelections = updated.options.length;
          updated.maxSelections = updated.options.length;
        } else if (patch.selectionType === 'SINGLE') {
          updated.minSelections = updated.isRequired ? 1 : 0;
          updated.maxSelections = 1;
        } else if (patch.isRequired !== undefined) {
          updated.minSelections = patch.isRequired
            ? Math.max(1, updated.minSelections)
            : Math.max(0, updated.minSelections);
        }
        return updated;
      }),
    );
    this.comboValidationError.set(false);
  }

  removeComboGroup(index: number): void {
    this.comboGroupRows.update((groups) => groups.filter((_, groupIndex) => groupIndex !== index));
  }

  addComboOption(groupIndex: number): void {
    const group = this.comboGroupRows()[groupIndex];
    if (!group) return;
    const product = this.availableComboProducts().find(
      (candidate) => !group.options.some((option) => option.productId === candidate.id),
    );
    const options = [
      ...group.options,
      {
        id: crypto.randomUUID(),
        productId: product?.id ?? '',
        productQuantity: 1,
        priceAdjustment: 0,
      },
    ];
    this.updateComboGroup(groupIndex, {
      options,
      ...(group.selectionType === 'FIXED'
        ? { isRequired: true, minSelections: options.length, maxSelections: options.length }
        : {}),
    });
  }

  updateComboOption(
    groupIndex: number,
    optionIndex: number,
    patch: Partial<ComboOptionRowItem>,
  ): void {
    const group = this.comboGroupRows()[groupIndex];
    if (!group) return;
    this.updateComboGroup(groupIndex, {
      options: group.options.map((option, index) =>
        index === optionIndex ? { ...option, ...patch } : option,
      ),
    });
  }

  removeComboOption(groupIndex: number, optionIndex: number): void {
    const group = this.comboGroupRows()[groupIndex];
    if (!group) return;
    const options = group.options.filter((_, index) => index !== optionIndex);
    this.updateComboGroup(groupIndex, {
      options,
      ...(group.selectionType === 'FIXED'
        ? { isRequired: true, minSelections: options.length, maxSelections: options.length }
        : {}),
    });
  }

  addVariationRow(): void {
    const currentBasePrice = this.form.controls.salePrice.value || 0;
    this.variationRows.update((rows) => [
      ...rows,
      { id: crypto.randomUUID(), name: '', salePrice: currentBasePrice },
    ]);
  }

  removeVariationRow(index: number): void {
    this.variationRows.update((rows) => rows.filter((_, idx) => idx !== index));
  }

  updateVariationRow(index: number, patch: Partial<VariationRowItem>): void {
    this.variationRows.update((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  }

  addInventoryIngredient(ingredientId?: string): void {
    const list = this.ingredients();
    const defaultIngId = ingredientId || (list.length > 0 ? list[0].id : '');
    this.recipeRows.update((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        isCustom: false,
        ingredientId: defaultIngId,
        customIngredientName: '',
        quantity: 1,
        notes: '',
      },
    ]);
  }

  addCustomIngredient(): void {
    this.recipeRows.update((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        isCustom: true,
        ingredientId: '',
        customIngredientName: '',
        quantity: 1,
        notes: '',
      },
    ]);
  }

  removeRecipeRow(index: number): void {
    this.recipeRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  toggleRowCustom(index: number): void {
    const list = this.ingredients();
    this.recipeRows.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const newIsCustom = !row.isCustom;
        return {
          ...row,
          isCustom: newIsCustom,
          ingredientId: newIsCustom ? '' : list.length > 0 ? list[0].id : '',
          customIngredientName: newIsCustom ? row.customIngredientName || '' : '',
        };
      }),
    );
  }

  updateRow(index: number, patch: Partial<RecipeRowItem>): void {
    this.recipeRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  openIngredientSelector(index: number): void {
    this.openSelectorIndex.set(index);
    this.ingredientSearch.set('');
    this.searchDebounced.set('');
  }

  closeIngredientSelector(): void {
    this.openSelectorIndex.set(null);
    this.ingredientSearch.set('');
    this.searchDebounced.set('');
  }

  onSearchInput(term: string): void {
    this.ingredientSearch.set(term);
    this.searchSubject.next(term);
  }

  selectIngredient(index: number, ingredientId: string): void {
    this.updateRow(index, { ingredientId });
    this.closeIngredientSelector();
  }

  getSelectedIngredient(ingredientId: string): ProductIngredientLookup | undefined {
    if (!ingredientId) return undefined;
    return (
      this.ingredients().find((i) => i.id === ingredientId) ??
      this.knownIngredients.get(ingredientId)
    );
  }

  getIngredientUnit(ingredientId: string): string {
    if (!ingredientId) return '';
    const ing = this.getSelectedIngredient(ingredientId);
    return ing?.measurementUnit?.code || ing?.measurementUnit?.name || '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab.set('general');
      return;
    }

    const value = this.form.getRawValue();

    const comboGroups: ProductComboGroupRequest[] = this.comboGroupRows().map((group, index) => ({
      name: group.name.trim(),
      selectionType: group.selectionType,
      isRequired: group.selectionType === 'FIXED' || group.isRequired,
      minSelections:
        group.selectionType === 'FIXED'
          ? group.options.length
          : group.selectionType === 'SINGLE'
            ? group.isRequired
              ? 1
              : 0
            : group.minSelections,
      maxSelections:
        group.selectionType === 'FIXED'
          ? group.options.length
          : group.selectionType === 'SINGLE'
            ? 1
            : group.maxSelections,
      order: index + 1,
      options: group.options.map((option, optionIndex) => ({
        productId: option.productId,
        productQuantity: Math.max(1, Number(option.productQuantity) || 1),
        priceAdjustment: Number(option.priceAdjustment) || 0,
        order: optionIndex + 1,
      })),
    }));
    if (
      value.type === 'COMBO' &&
      (comboGroups.length === 0 ||
        comboGroups.some(
          (group) =>
            !group.name ||
            group.options.length === 0 ||
            group.options.some((option) => !option.productId) ||
            new Set(group.options.map((option) => option.productId)).size !==
              group.options.length ||
            (group.selectionType !== 'FIXED' &&
              (group.minSelections < (group.isRequired ? 1 : 0) ||
                group.maxSelections < group.minSelections)),
        ))
    ) {
      this.comboValidationError.set(true);
      this.activeTab.set('combo');
      return;
    }

    const recipe: ProductRecipeItemRequest[] = this.recipeRows()
      .filter((r) => {
        const hasName = r.isCustom
          ? r.customIngredientName.trim().length > 0
          : r.ingredientId.trim().length > 0;
        return hasName && r.quantity > 0;
      })
      .map((r, index) => ({
        ingredientId: r.isCustom ? null : r.ingredientId.trim() || null,
        customIngredientName: r.isCustom ? r.customIngredientName.trim() : null,
        quantity: Math.max(0.0001, Number(r.quantity) || 1),
        notes: r.notes.trim() || null,
        order: index + 1,
      }));

    const variations: ProductVariationRequest[] = this.variationRows()
      .filter((v) => v.name.trim().length > 0 && v.salePrice > 0)
      .map((v, index) => ({
        id: v.id.startsWith('temp-') || v.id.length !== 36 ? undefined : v.id,
        name: v.name.trim(),
        salePrice: Math.max(0.01, Number(v.salePrice) || 0.01),
        order: index + 1,
        isActive: true,
      }));

    let salePrice = value.salePrice;
    if (variations.length > 0 && (!salePrice || salePrice <= 0)) {
      salePrice = variations[0].salePrice;
    }

    this.submitted.emit({
      type: value.type,
      categoryId: value.categoryId,
      name: value.name.trim().replace(/\s+/g, ' '),
      salePrice,
      description: this.cleanOptional(value.description),
      image: this.cleanOptional(value.image),
      preparationTimeMinutes: value.preparationTimeMinutes,
      isInventoryTracked:
        value.type === 'NORMAL' && this.selectedCategory()?.isInventoryTracked
          ? value.isInventoryTracked
          : false,
      recipe: value.type === 'NORMAL' ? recipe : [],
      ...(variations.length > 0 ? { variations } : {}),
      ...(value.type === 'COMBO' ? { comboGroups } : {}),
    });
  }

  close(): void {
    if (!this.submitting()) this.cancelled.emit();
  }

  markPreviewFailed(): void {
    this.previewFailed.set(true);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.close();
  }

  private cleanOptional(value: string): string | null {
    const clean = value.trim();
    return clean || null;
  }

  private applyServerErrors(error: ProductFeatureError | null): void {
    if (!error || error.code !== 'VALIDATION_ERROR') return;
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const key = field.split('.').at(-1)?.toLowerCase();
      const controls = this.form.controls;
      const control =
        key === 'type'
          ? controls.type
          : key === 'categoryid'
            ? controls.categoryId
            : key === 'name'
              ? controls.name
              : key === 'saleprice'
                ? controls.salePrice
                : key === 'description'
                  ? controls.description
                  : key === 'image'
                    ? controls.image
                    : key === 'preparationtimeminutes'
                      ? controls.preparationTimeMinutes
                      : key === 'isinventorytracked'
                        ? controls.isInventoryTracked
                        : null;
      if (control && messages.length > 0) {
        control.setErrors({ ...control.errors, server: messages });
        control.markAsTouched();
      }
    }
  }
}
