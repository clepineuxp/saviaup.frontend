import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { nonBlankRequiredValidator } from '../../../shared/utils/form-validators';
import { Expense } from '../models/expense.model';
import { CreateExpensePayload, UpdateExpensePayload } from '../data-access/expense.contracts';
import { SupplierStoreService } from '../../suppliers/data-access/supplier-store.service';

interface ConfiguredPaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-expense-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './expense-form-dialog.component.html',
  styleUrl: './expense-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormDialogComponent implements OnInit {
  private readonly organizationTime = inject(OrganizationTime);
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  readonly supplierStore = inject(SupplierStoreService);

  readonly expense = input<Expense | null>(null);
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly paymentMethods = signal<ConfiguredPaymentMethod[]>([]);

  readonly submitted = output<CreateExpensePayload | UpdateExpensePayload>();
  readonly cancelled = output<void>();

  private getTodayDateString(): string {
    return this.organizationTime.localDate();
  }

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [nonBlankRequiredValidator(), Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(1000)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    isCashOut: [true, [Validators.required]],
    paymentMethod: ['', [nonBlankRequiredValidator()]],
    supplierId: [''],
    expenseDate: [this.getTodayDateString(), [Validators.required]],
  });

  ngOnInit(): void {
    this.supplierStore.loadLookup();
    const exp = this.expense();
    if (exp) {
      const dateVal = exp.expenseDate
        ? (exp.businessDate ?? this.organizationTime.localDate(exp.expenseDate))
        : this.getTodayDateString();

      this.form.reset({
        name: exp.name,
        description: exp.description ?? '',
        amount: exp.amount,
        isCashOut: exp.isCashOut,
        paymentMethod: exp.paymentMethod,
        supplierId: exp.supplier?.id ?? '',
        expenseDate: dateVal,
      });
    }

    this.api
      .get<ConfiguredPaymentMethod[]>(API_ENDPOINTS.settings.paymentMethods)
      .pipe(catchError(() => of([])))
      .subscribe((methods) => {
        const activeMethods = methods.filter((method) => method.isActive);
        this.paymentMethods.set(activeMethods);
        if (!exp) this.form.controls.paymentMethod.setValue(activeMethods[0]?.name ?? '');
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();

    this.submitted.emit({
      name: val.name.trim(),
      description: val.description.trim() || null,
      amount: val.amount,
      isCashOut: val.isCashOut,
      paymentMethod: val.paymentMethod.trim(),
      supplierId: val.supplierId ? val.supplierId : null,
      expenseDate: null,
      businessDate: val.expenseDate,
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
