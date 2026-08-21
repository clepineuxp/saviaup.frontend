import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CashRegisterStore } from '../data-access/cash-register-store.service';
import { CashRegister } from '../models/cash-register.model';

@Component({
  selector: 'app-cash-register-management-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, UiAlertComponent, UiButtonComponent],
  templateUrl: './cash-register-management-page.component.html',
  styleUrl: './cash-register-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterManagementPageComponent implements OnInit {
  readonly store = inject(CashRegisterStore);
  private readonly fb = inject(FormBuilder);

  readonly isModalOpen = signal(false);
  readonly editingRegister = signal<CashRegister | null>(null);
  readonly registerToDelete = signal<CashRegister | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    location: ['', [Validators.maxLength(200)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.store.load(true).subscribe();
  }

  openCreateModal(): void {
    this.editingRegister.set(null);
    this.form.reset({
      name: '',
      location: '',
      isActive: !this.store.hasActiveCashRegister(),
    });
    this.isModalOpen.set(true);
  }

  openEditModal(register: CashRegister): void {
    this.editingRegister.set(register);
    this.form.patchValue({
      name: register.name,
      location: register.location ?? '',
      isActive: register.isActive,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingRegister.set(null);
  }

  saveRegister(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, location, isActive } = this.form.getRawValue();
    const editing = this.editingRegister();

    if (editing) {
      this.store
        .update(editing.id, {
          name: name?.trim() ?? '',
          location: location?.trim() || null,
          isActive: Boolean(isActive),
        })
        .subscribe((result) => {
          if (result) this.closeModal();
        });
    } else {
      this.store
        .create({
          name: name?.trim() ?? '',
          location: location?.trim() || null,
          isActive: Boolean(isActive),
        })
        .subscribe((result) => {
          if (result) this.closeModal();
        });
    }
  }

  toggleStatus(register: CashRegister): void {
    this.store.setStatus(register.id, !register.isActive).subscribe();
  }

  confirmDelete(register: CashRegister): void {
    this.registerToDelete.set(register);
  }

  cancelDelete(): void {
    this.registerToDelete.set(null);
  }

  deleteRegister(): void {
    const register = this.registerToDelete();
    if (!register) return;

    this.store.delete(register.id).subscribe((success) => {
      if (success) this.cancelDelete();
    });
  }
}
