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
  requiredBooleanValidator,
} from '../../../shared/utils/form-validators';
import { CategoryOperationError } from '../data-access/category-store.service';
import { Category, CreateCategoryRequest } from '../models/category.model';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
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
    imageUrl: ['', [Validators.maxLength(2048), absoluteHttpUrlValidator()]],
    isInventoryTracked: [true, [requiredBooleanValidator()]],
  });
  readonly imageUrlValue = toSignal(this.form.controls.imageUrl.valueChanges, {
    initialValue: this.form.controls.imageUrl.value,
  });
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
      const category = this.category();
      this.form.reset({
        name: category?.name ?? '',
        description: category?.description ?? '',
        imageUrl: category?.imageUrl ?? '',
        isInventoryTracked: category?.isInventoryTracked ?? true,
      });
      this.previewFailed.set(false);
    });

    effect(() => this.applyServerError(this.serverError()));

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
      name: value.name.trim().replace(/\s+/g, ' '),
      description: this.cleanOptional(value.description),
      imageUrl: this.cleanOptional(value.imageUrl),
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
            : normalized === 'imageurl'
              ? this.form.controls.imageUrl
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
