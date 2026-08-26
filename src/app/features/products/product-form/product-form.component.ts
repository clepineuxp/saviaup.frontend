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
import { ImageSelectorComponent, ImageSelectionResult } from '../../../shared/components/image-selector/image-selector.component';
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
  ProductType,
} from '../models/product.model';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, ImageSelectorComponent, TranslatePipe],
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
    image: this.formBuilder.nonNullable.control('', [imageUrlValidator()]),
    preparationTimeMinutes: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    isInventoryTracked: this.formBuilder.nonNullable.control(false),
  });

  onImageSelected(result: ImageSelectionResult | null): void {
    this.form.controls.image.setValue(result?.base64Content || '');
  }
  private readonly categoryIdValue = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  readonly selectedCategory = computed(() =>
    this.categories().find((category) => category.id === this.categoryIdValue()),
  );
  readonly inventoryDisabled = computed(() => !this.selectedCategory()?.isInventoryTracked);

  constructor() {
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
      image: this.cleanOptional(value.image),
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
