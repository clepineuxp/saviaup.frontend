import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import {
  absoluteHttpUrlValidator,
  nonBlankRequiredValidator,
} from '../../../shared/utils/form-validators';
import { ProductFeatureError } from '../data-access/product-store.service';
import {
  CreateProductRequest,
  Product,
  ProductCategory,
  ProductType,
} from '../models/product.model';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly product = input<Product | null>(null);
  readonly categories = input.required<readonly ProductCategory[]>();
  readonly submitting = input(false);
  readonly error = input<ProductFeatureError | null>(null);
  readonly submitted = output<CreateProductRequest>();
  readonly cancelled = output<void>();
  readonly previewFailed = signal(false);
  readonly form = this.formBuilder.group({
    type: this.formBuilder.nonNullable.control<ProductType>('NORMAL', [Validators.required]),
    categoryId: this.formBuilder.nonNullable.control('', [Validators.required]),
    name: this.formBuilder.nonNullable.control('', [
      nonBlankRequiredValidator(),
      Validators.maxLength(120),
    ]),
    salePrice: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
    description: this.formBuilder.nonNullable.control('', [Validators.maxLength(1000)]),
    imageUrl: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(2048),
      absoluteHttpUrlValidator(),
    ]),
    preparationTimeMinutes: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    isInventoryTracked: this.formBuilder.nonNullable.control(false),
  });
  private readonly categoryIdValue = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  private readonly imageUrlValue = toSignal(this.form.controls.imageUrl.valueChanges, {
    initialValue: this.form.controls.imageUrl.value,
  });
  readonly selectedCategory = computed(() =>
    this.categories().find((category) => category.id === this.categoryIdValue()),
  );
  readonly inventoryDisabled = computed(() => !this.selectedCategory()?.isInventoryTracked);
  readonly previewUrl = computed(() => {
    const value = this.imageUrlValue().trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
    } catch {
      return null;
    }
  });

  constructor() {
    effect(() => {
      const product = this.product();
      this.form.reset({
        type: product?.type ?? 'NORMAL',
        categoryId: product?.category.id ?? '',
        name: product?.name ?? '',
        salePrice: product?.salePrice ?? 0,
        description: product?.description ?? '',
        imageUrl: product?.imageUrl ?? '',
        preparationTimeMinutes: product?.preparationTimeMinutes ?? null,
        isInventoryTracked: product?.isInventoryTracked ?? false,
      });
      this.previewFailed.set(false);
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
    this.form.controls.imageUrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.previewFailed.set(false));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      type: value.type,
      categoryId: value.categoryId,
      name: value.name.trim().replace(/\s+/g, ' '),
      salePrice: value.salePrice,
      description: this.cleanOptional(value.description),
      imageUrl: this.cleanOptional(value.imageUrl),
      preparationTimeMinutes: value.preparationTimeMinutes,
      isInventoryTracked: this.selectedCategory()?.isInventoryTracked
        ? value.isInventoryTracked
        : false,
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
                  : key === 'imageurl'
                    ? controls.imageUrl
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
