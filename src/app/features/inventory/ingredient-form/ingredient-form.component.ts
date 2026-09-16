import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { nonBlankRequiredValidator } from '../../../shared/utils/form-validators';
import { InventoryFeatureError } from '../data-access/inventory-store.service';
import {
  CategoryReference,
  CreateIngredientRequest,
  Ingredient,
  MeasurementUnit,
  UpdateIngredientRequest,
} from '../models/inventory.model';

@Component({
  selector: 'app-ingredient-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './ingredient-form.component.html',
  styleUrl: './ingredient-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly ingredient = input<Ingredient | null>(null);
  readonly categories = input.required<readonly CategoryReference[]>();
  readonly units = input.required<readonly MeasurementUnit[]>();
  readonly submitting = input(false);
  readonly error = input<InventoryFeatureError | null>(null);
  readonly submitted = output<CreateIngredientRequest | UpdateIngredientRequest>();
  readonly cancelled = output<void>();
  readonly form = this.formBuilder.nonNullable.group({
    categoryId: ['', [Validators.required]],
    measurementUnitId: ['', [Validators.required]],
    name: ['', [nonBlankRequiredValidator(), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
    minimumStock: [0, [Validators.required, Validators.min(0)]],
    initialStock: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    effect(() => {
      const ingredient = this.ingredient();
      this.form.reset({
        categoryId: ingredient?.category.id ?? '',
        measurementUnitId: ingredient?.unit.id ?? '',
        name: ingredient?.name ?? '',
        description: ingredient?.description ?? '',
        minimumStock: ingredient?.minimumStock ?? 0,
        initialStock: 0,
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const base: UpdateIngredientRequest = {
      categoryId: value.categoryId,
      measurementUnitId: value.measurementUnitId,
      name: value.name.trim().replace(/\s+/g, ' '),
      description: value.description.trim() || null,
      minimumStock: value.minimumStock,
    };
    this.submitted.emit(this.ingredient() ? base : { ...base, initialStock: value.initialStock });
  }

  close(): void {
    if (!this.submitting()) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.close();
  }
}
