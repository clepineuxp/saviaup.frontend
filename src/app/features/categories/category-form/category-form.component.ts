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
  requiredBooleanValidator,
} from '../../../shared/utils/form-validators';
import { CategoryOperationError } from '../data-access/category-store.service';
import { Category, CreateCategoryRequest } from '../models/category.model';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, ImageSelectorComponent, TranslatePipe],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly category = input<Category | null>(null);
  readonly submitting = input(false);
  readonly serverError = input<CategoryOperationError | null>(null);
  readonly submitted = output<CreateCategoryRequest>();
  readonly cancelled = output<void>();
  readonly previewFailed = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [nonBlankRequiredValidator(), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
    image: ['', [imageUrlValidator()]],
    isInventoryTracked: [true, [requiredBooleanValidator()]],
  });

  onImageSelected(result: ImageSelectionResult | null): void {
    this.form.controls.image.setValue(result?.base64Content || '');
  }

  constructor() {
    effect(() => {
      const category = this.category();
      this.form.reset({
        name: category?.name ?? '',
        description: category?.description ?? '',
        image: category?.image ?? '',
        isInventoryTracked: category?.isInventoryTracked ?? true,
      });
      this.previewFailed.set(false);
    });

    effect(() => this.applyServerError(this.serverError()));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      name: value.name.trim().replace(/\s+/g, ' '),
      description: this.cleanOptional(value.description),
      image: this.cleanOptional(value.image),
      isInventoryTracked: value.isInventoryTracked,
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
    return clean ? clean : null;
  }

  private applyServerError(error: CategoryOperationError | null): void {
    if (!error) return;
    if (error.code === 'CATEGORY_NAME_ALREADY_EXISTS') {
      this.form.controls.name.setErrors({
        ...this.form.controls.name.errors,
        duplicate: true,
      });
      return;
    }
    if (error.code !== 'VALIDATION_ERROR') return;

    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const normalized = field.toLowerCase();
      const control =
        normalized === 'name'
          ? this.form.controls.name
          : normalized === 'description'
            ? this.form.controls.description
            : normalized === 'image'
              ? this.form.controls.image
              : normalized === 'isinventorytracked'
                ? this.form.controls.isInventoryTracked
                : null;
      if (control && messages.length > 0) {
        control.setErrors({ ...control.errors, server: messages });
        control.markAsTouched();
      }
    }
  }
}
