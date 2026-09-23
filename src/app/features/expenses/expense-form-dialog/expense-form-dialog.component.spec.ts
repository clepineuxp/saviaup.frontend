import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationTime } from '../../../core/tenant/organization-time.service';
import { ApiClient } from '../../../shared/api/api-client.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { SupplierStoreService } from '../../suppliers/data-access/supplier-store.service';
import { SupplierLookup } from '../../suppliers/models/supplier.model';
import { Expense } from '../models/expense.model';
import { ExpenseFormDialogComponent } from './expense-form-dialog.component';

const suppliers: SupplierLookup[] = [
  {
    id: 'supplier-1',
    name: 'Distribuciones Norte SAS',
    commercialName: 'Mercado Verde',
  },
  {
    id: 'supplier-2',
    name: 'Café del Bosque',
    commercialName: 'Origen Café',
  },
  {
    id: 'supplier-3',
    name: 'Servicios Centrales',
    commercialName: null,
  },
];

const existingExpense: Expense = {
  id: 'expense-1',
  consecutiveNumber: 18,
  name: 'Compra de insumos',
  description: 'Compra inicial',
  amount: 98000,
  isCashOut: true,
  paymentMethod: 'Efectivo',
  supplier: { id: 'supplier-1', name: 'Distribuciones Norte SAS' },
  expenseDate: '2026-09-18T05:00:00Z',
  businessDate: '2026-09-18',
  status: 'ACTIVE',
  annulledReason: null,
  annulledAt: null,
  annulledByUserName: null,
  createdByUserName: 'Admin',
  lastModifiedByUserName: 'Admin',
  createdAt: '2026-09-18T12:00:00Z',
  updatedAt: '2026-09-18T12:00:00Z',
};

describe('ExpenseFormDialogComponent', () => {
  let fixture: ComponentFixture<ExpenseFormDialogComponent>;
  let component: ExpenseFormDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseFormDialogComponent],
      providers: [
        {
          provide: OrganizationTime,
          useValue: { localDate: () => '2026-09-23' },
        },
        {
          provide: ApiClient,
          useValue: {
            get: vi.fn(() => of([{ id: 'payment-1', name: 'Efectivo', isActive: true }])),
          },
        },
        {
          provide: SupplierStoreService,
          useValue: {
            lookupItems: signal(suppliers),
            lookupLoading: signal(false),
            loadLookup: vi.fn(),
          },
        },
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseFormDialogComponent);
    fixture.componentRef.setInput('expense', null);
    fixture.componentRef.setInput('submitting', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    component = fixture.componentInstance;
  });

  it('filters suppliers by commercial name and displays name with commercial name', () => {
    const input = fixture.nativeElement.querySelector('#expenseSupplierSearch') as HTMLInputElement;
    input.value = 'mercado';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('.supplier-combobox__option--supplier'),
    ) as HTMLElement[];

    expect(options).toHaveLength(1);
    expect(options[0].querySelector('strong')?.textContent).toBe('Distribuciones Norte SAS');
    expect(options[0].querySelector('.supplier-combobox__separator')?.textContent).toBe('|');
    expect(options[0].textContent).toContain('Mercado Verde');
  });

  it('filters suppliers by legal name without considering accents', () => {
    component.supplierSearch.set('cafe del bosque');

    expect(component.filteredSuppliers().map((supplier) => supplier.id)).toEqual(['supplier-2']);
  });

  it('selects and clears a supplier while preserving the reactive form value', () => {
    component.selectSupplier(suppliers[0]);
    fixture.detectChanges();

    expect(component.form.controls.supplierId.value).toBe('supplier-1');
    expect(component.supplierSearch()).toBe('Distribuciones Norte SAS | Mercado Verde');

    component.openSupplierCombobox();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('.supplier-combobox__option--empty') as HTMLButtonElement
    ).click();

    expect(component.form.controls.supplierId.value).toBe('');
    expect(component.supplierSearch()).toBe('');
  });

  it('supports keyboard navigation and selection from the filtered results', () => {
    const input = fixture.nativeElement.querySelector('#expenseSupplierSearch') as HTMLInputElement;
    input.value = 'origen';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(component.form.controls.supplierId.value).toBe('supplier-2');
  });

  it('clears an unconfirmed search when the combobox closes', () => {
    const input = fixture.nativeElement.querySelector('#expenseSupplierSearch') as HTMLInputElement;
    input.value = 'búsqueda sin seleccionar';
    input.dispatchEvent(new Event('input'));

    component.closeSupplierCombobox();

    expect(component.form.controls.supplierId.value).toBe('');
    expect(component.supplierSearch()).toBe('');
  });

  it('shows a summary before emitting a new expense', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((payload) => submitted.push(payload));
    component.form.patchValue({
      name: 'Servicio técnico',
      description: 'Mantenimiento preventivo',
      amount: 125000,
      isCashOut: false,
      paymentMethod: 'Efectivo',
      supplierId: 'supplier-2',
      expenseDate: '2026-09-23',
    });

    component.submit();
    fixture.detectChanges();

    expect(submitted).toEqual([]);
    expect(component.pendingCreate()).toMatchObject({
      name: 'Servicio técnico',
      amount: 125000,
      isCashOut: false,
      businessDate: '2026-09-23',
    });
    expect(fixture.nativeElement.querySelector('.expense-confirmation')).not.toBeNull();

    component.confirmCreate();
    component.confirmCreate();

    expect(submitted).toEqual([component.pendingCreate()]);
  });

  it('locks amount, date and cash origin when editing and omits them from the payload', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(ExpenseFormDialogComponent);
    fixture.componentRef.setInput('expense', existingExpense);
    fixture.componentRef.setInput('submitting', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    component = fixture.componentInstance;
    const submitted: unknown[] = [];
    component.submitted.subscribe((payload) => submitted.push(payload));

    expect(component.form.controls.amount.disabled).toBe(true);
    expect(component.form.controls.expenseDate.disabled).toBe(true);
    expect(component.form.controls.isCashOut.disabled).toBe(true);

    component.form.patchValue({
      name: 'Compra corregida',
      description: 'Nuevo detalle',
      paymentMethod: 'Transferencia',
      supplierId: '',
    });
    component.submit();

    expect(submitted).toEqual([
      {
        name: 'Compra corregida',
        description: 'Nuevo detalle',
        paymentMethod: 'Transferencia',
        supplierId: null,
      },
    ]);
    expect(submitted[0]).not.toHaveProperty('amount');
    expect(submitted[0]).not.toHaveProperty('expenseDate');
    expect(submitted[0]).not.toHaveProperty('isCashOut');
  });
});
