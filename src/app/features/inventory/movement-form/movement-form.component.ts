import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { InventoryFeatureError } from '../data-access/inventory-store.service';
import {
  CreateInventoryMovementRequest,
  Ingredient,
  InventoryMovementDirection,
  InventoryMovementReason,
} from '../models/inventory.model';

const REASONS: Readonly<Record<InventoryMovementDirection, readonly InventoryMovementReason[]>> = {
  increase: ['purchase', 'production', 'acquisition'],
  decrease: ['expiration', 'loss', 'waste'],
};

@Component({
  selector: 'app-movement-form',
  imports: [ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './movement-form.component.html',
  styleUrl: './movement-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly ingredients = input.required<readonly Ingredient[]>();
  readonly submitting = input(false);
  readonly error = input<InventoryFeatureError | null>(null);
  readonly submitted = output<CreateInventoryMovementRequest>();
  readonly cancelled = output<void>();
  readonly direction = signal<InventoryMovementDirection>('increase');
  readonly form = this.formBuilder.nonNullable.group({
    ingredientId: ['', [Validators.required]],
    direction: ['increase' as InventoryMovementDirection, [Validators.required]],
    reason: ['' as InventoryMovementReason | '', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    note: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    this.form.controls.direction.valueChanges.pipe(takeUntilDestroyed()).subscribe((direction) => {
      this.direction.set(direction);
      const reason = this.form.controls.reason.value;
      if (reason && !REASONS[direction].includes(reason)) {
        this.form.controls.reason.setValue('');
      }
    });
  }

  reasons(): readonly InventoryMovementReason[] {
    return REASONS[this.direction()];
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      ingredientId: value.ingredientId,
      direction: value.direction,
      reason: value.reason as InventoryMovementReason,
      quantity: value.quantity,
      note: value.note.trim() || null,
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
