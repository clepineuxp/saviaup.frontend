import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { nonBlankRequiredValidator } from '../../../shared/utils/form-validators';
import { Supplier } from '../models/supplier.model';
import { CreateSupplierPayload, UpdateSupplierPayload } from '../data-access/supplier.contracts';

@Component({
  selector: 'app-supplier-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './supplier-form-dialog.component.html',
  styleUrl: './supplier-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormDialogComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly supplier = input<Supplier | null>(null);
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<CreateSupplierPayload | UpdateSupplierPayload>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [nonBlankRequiredValidator(), Validators.maxLength(160)]],
    commercialName: ['', [Validators.maxLength(160)]],
    document: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(320)]],
    phone: ['', [Validators.maxLength(50)]],
    address: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const s = this.supplier();
    if (s) {
      this.form.patchValue({
        name: s.name,
        commercialName: s.commercialName ?? '',
        document: s.document ?? '',
        email: s.email ?? '',
        phone: s.phone ?? '',
        address: s.address ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();

    this.submitted.emit({
      name: val.name.trim(),
      commercialName: val.commercialName.trim() || null,
      document: val.document.trim() || null,
      email: val.email.trim() || null,
      phone: val.phone.trim() || null,
      address: val.address.trim() || null,
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
