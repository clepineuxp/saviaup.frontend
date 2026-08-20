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
  CreateMeasurementUnitRequest,
  MeasurementUnit,
  UpdateMeasurementUnitRequest,
} from '../models/inventory.model';

@Component({
  selector: 'app-unit-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './unit-form.component.html',
  styleUrl: './unit-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly unit = input<MeasurementUnit | null>(null);
  readonly submitting = input(false);
  readonly error = input<InventoryFeatureError | null>(null);
  readonly submitted = output<CreateMeasurementUnitRequest | UpdateMeasurementUnitRequest>();
  readonly cancelled = output<void>();
  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [nonBlankRequiredValidator(), Validators.maxLength(20)]],
    name: ['', [nonBlankRequiredValidator(), Validators.maxLength(120)]],
  });

  constructor() {
    effect(() => {
      const unit = this.unit();
      this.form.reset({ code: unit?.code ?? '', name: unit?.name ?? '' });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      code: value.code.trim().replace(/\s+/g, ' ').toLowerCase(),
      name: value.name.trim().replace(/\s+/g, ' '),
    });
  }

  close(): void {
    if (!this.submitting()) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.close();
  }
}
