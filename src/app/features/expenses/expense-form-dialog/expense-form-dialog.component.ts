import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
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
import { SupplierLookup } from '../../suppliers/models/supplier.model';

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
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly supplierStore = inject(SupplierStoreService);

  readonly expense = input<Expense | null>(null);
  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly paymentMethods = signal<ConfiguredPaymentMethod[]>([]);
  readonly pendingCreate = signal<CreateExpensePayload | null>(null);
  readonly confirmingCreate = signal(false);
  readonly supplierSearch = signal('');
  readonly supplierComboboxOpen = signal(false);
  readonly activeSupplierIndex = signal(-1);
  readonly filteredSuppliers = computed(() => {
    const query = this.normalizeSupplierSearch(this.supplierSearch());
    if (!query) return this.supplierStore.lookupItems();

    return this.supplierStore
      .lookupItems()
      .filter((supplier) =>
        this.normalizeSupplierSearch(`${supplier.name} ${supplier.commercialName ?? ''}`).includes(
          query,
        ),
      );
  });

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

  private supplierSearchDirty = false;
  private readonly supplierFormInitialized = signal(false);

  private readonly synchronizeSupplierLabel = effect(() => {
    const suppliers = this.supplierStore.lookupItems();
    const expense = this.expense();
    const formInitialized = this.supplierFormInitialized();
    if (this.supplierSearchDirty) return;

    const supplierId = this.form.controls.supplierId.value;
    const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    if (selectedSupplier) {
      this.supplierSearch.set(this.supplierDisplayName(selectedSupplier));
    } else if (!formInitialized && expense?.supplier) {
      this.supplierSearch.set(expense.supplier.name);
    }
  });

  private readonly resetConfirmationAfterError = effect(() => {
    if (this.errorMessage()) this.confirmingCreate.set(false);
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
      this.supplierSearch.set(exp.supplier?.name ?? '');
      this.form.controls.amount.disable();
      this.form.controls.expenseDate.disable();
      this.form.controls.isCashOut.disable();
    }
    this.supplierFormInitialized.set(true);

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

    const editablePayload: UpdateExpensePayload = {
      name: val.name.trim(),
      description: val.description.trim() || null,
      paymentMethod: val.paymentMethod.trim(),
      supplierId: val.supplierId ? val.supplierId : null,
    };

    if (this.expense()) {
      this.submitted.emit(editablePayload);
      return;
    }

    this.closeSupplierCombobox();
    this.pendingCreate.set({
      ...editablePayload,
      amount: val.amount,
      isCashOut: val.isCashOut,
      expenseDate: null,
      businessDate: val.expenseDate,
    });
  }

  confirmCreate(): void {
    const pending = this.pendingCreate();
    if (!pending || this.submitting() || this.confirmingCreate()) return;
    this.confirmingCreate.set(true);
    this.submitted.emit(pending);
  }

  editPendingCreate(): void {
    if (!this.submitting() && !this.confirmingCreate()) this.pendingCreate.set(null);
  }

  pendingSupplierName(): string | null {
    const supplierId = this.pendingCreate()?.supplierId;
    if (!supplierId) return null;
    const supplier = this.supplierStore.lookupItems().find((item) => item.id === supplierId);
    return supplier ? this.supplierDisplayName(supplier) : this.supplierSearch() || null;
  }

  openSupplierCombobox(): void {
    if (this.submitting()) return;
    this.supplierComboboxOpen.set(true);
    const selectedId = this.form.controls.supplierId.value;
    const selectedIndex = this.filteredSuppliers().findIndex(
      (supplier) => supplier.id === selectedId,
    );
    this.activeSupplierIndex.set(selectedIndex);
  }

  toggleSupplierCombobox(): void {
    if (this.supplierComboboxOpen()) this.closeSupplierCombobox();
    else this.openSupplierCombobox();
  }

  closeSupplierCombobox(): void {
    this.supplierComboboxOpen.set(false);
    this.activeSupplierIndex.set(-1);
    if (this.supplierSearchDirty) {
      const selectedSupplier = this.supplierStore
        .lookupItems()
        .find((supplier) => supplier.id === this.form.controls.supplierId.value);
      this.supplierSearch.set(selectedSupplier ? this.supplierDisplayName(selectedSupplier) : '');
      this.supplierSearchDirty = false;
    }
  }

  onSupplierSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.supplierSearchDirty = true;
    this.supplierSearch.set(value);
    this.form.controls.supplierId.setValue('');
    this.supplierComboboxOpen.set(true);
    this.activeSupplierIndex.set(this.filteredSuppliers().length > 0 ? 0 : -1);
  }

  onSupplierSearchKeydown(event: KeyboardEvent): void {
    const suppliers = this.filteredSuppliers();
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeSupplierCombobox();
      return;
    }
    if (event.key === 'Tab') {
      this.closeSupplierCombobox();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.supplierComboboxOpen.set(true);
      if (suppliers.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const currentIndex = this.activeSupplierIndex();
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : suppliers.length - 1
          : (currentIndex + direction + suppliers.length) % suppliers.length;
      this.activeSupplierIndex.set(nextIndex);
      return;
    }
    if (event.key === 'Enter' && this.supplierComboboxOpen()) {
      const activeSupplier = suppliers[this.activeSupplierIndex()];
      if (activeSupplier) {
        event.preventDefault();
        this.selectSupplier(activeSupplier);
      }
    }
  }

  selectSupplier(supplier: SupplierLookup): void {
    this.supplierSearchDirty = false;
    this.form.controls.supplierId.setValue(supplier.id);
    this.supplierSearch.set(this.supplierDisplayName(supplier));
    this.closeSupplierCombobox();
  }

  clearSupplier(): void {
    this.supplierSearchDirty = false;
    this.form.controls.supplierId.setValue('');
    this.supplierSearch.set('');
    this.closeSupplierCombobox();
  }

  supplierOptionId(index: number): string {
    return `expense-supplier-option-${index}`;
  }

  activeSupplierOptionId(): string | null {
    const index = this.activeSupplierIndex();
    return this.supplierComboboxOpen() && index >= 0 ? this.supplierOptionId(index) : null;
  }

  supplierDisplayName(supplier: SupplierLookup): string {
    return supplier.commercialName
      ? `${supplier.name} | ${supplier.commercialName}`
      : supplier.name;
  }

  close(): void {
    if (this.pendingCreate()) {
      this.editPendingCreate();
      return;
    }
    if (!this.submitting()) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.pendingCreate()) {
      this.editPendingCreate();
      return;
    }
    if (this.supplierComboboxOpen()) {
      this.closeSupplierCombobox();
      return;
    }
    this.close();
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    const combobox = this.elementRef.nativeElement.querySelector('.supplier-combobox');
    if (target instanceof Node && combobox && !combobox.contains(target)) {
      this.closeSupplierCombobox();
    }
  }

  private normalizeSupplierSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase();
  }
}
