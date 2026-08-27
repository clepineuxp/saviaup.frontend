import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Expense } from '../models/expense.model';
import { AnnulExpensePayload } from '../data-access/expense.contracts';

@Component({
  selector: 'app-expense-annul-dialog',
  imports: [CommonModule, ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './expense-annul-dialog.component.html',
  styleUrl: './expense-annul-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseAnnulDialogComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly expense = input.required<Expense>();
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly annulled = output<AnnulExpensePayload>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    reason: [''],
  });

  submit(): void {
    const val = this.form.getRawValue();
    this.annulled.emit({
      reason: val.reason.trim() || null,
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
