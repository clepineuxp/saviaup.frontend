import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ExpenseStoreService } from '../data-access/expense-store.service';
import { SupplierStoreService } from '../../suppliers/data-access/supplier-store.service';
import { Expense } from '../models/expense.model';
import { AnnulExpensePayload, CreateExpensePayload, UpdateExpensePayload } from '../data-access/expense.contracts';
import { ExpenseFormDialogComponent } from '../expense-form-dialog/expense-form-dialog.component';
import { ExpenseAnnulDialogComponent } from '../expense-annul-dialog/expense-annul-dialog.component';

@Component({
  selector: 'app-expenses-page',
  imports: [
    CommonModule,
    FormsModule,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
    ExpenseFormDialogComponent,
    ExpenseAnnulDialogComponent,
  ],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesPageComponent implements OnInit {
  readonly store = inject(ExpenseStoreService);
  readonly supplierStore = inject(SupplierStoreService);

  readonly showFormDialog = signal(false);
  readonly showAnnulDialog = signal(false);
  readonly selectedExpense = signal<Expense | null>(null);

  readonly fromDateInput = signal<string>(this.store.fromDateFilter());
  readonly toDateInput = signal<string>(this.store.toDateFilter());
  readonly searchInput = signal<string>('');
  readonly supplierFilter = signal<string>('');
  readonly paymentMethodFilter = signal<string>('ALL');
  readonly statusFilter = signal<string>('ALL');
  readonly cashOutFilter = signal<string>('ALL');

  ngOnInit(): void {
    this.supplierStore.loadLookup();
    this.store.loadPage(1);
  }

  applyFilters(): void {
    const cashOutVal =
      this.cashOutFilter() === 'CASHOUT'
        ? true
        : this.cashOutFilter() === 'NON_CASHOUT'
        ? false
        : undefined;

    this.store.setFilters(
      this.fromDateInput(),
      this.toDateInput(),
      this.searchInput(),
      this.supplierFilter(),
      this.statusFilter(),
      this.paymentMethodFilter(),
      cashOutVal
    );
  }

  resetDateFilters(): void {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fromDateInput.set(today);
    this.toDateInput.set(today);
    this.applyFilters();
  }

  openCreateDialog(): void {
    this.selectedExpense.set(null);
    this.showFormDialog.set(true);
  }

  openEditDialog(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.showFormDialog.set(true);
  }

  closeFormDialog(): void {
    this.showFormDialog.set(false);
    this.selectedExpense.set(null);
  }

  handleFormSubmit(payload: CreateExpensePayload | UpdateExpensePayload): void {
    const current = this.selectedExpense();
    if (current) {
      this.store.updateExpense(current.id, payload as UpdateExpensePayload, () =>
        this.closeFormDialog()
      );
    } else {
      this.store.createExpense(payload as CreateExpensePayload, () =>
        this.closeFormDialog()
      );
    }
  }

  openAnnulDialog(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.showAnnulDialog.set(true);
  }

  closeAnnulDialog(): void {
    this.showAnnulDialog.set(false);
    this.selectedExpense.set(null);
  }

  handleAnnulSubmit(payload: AnnulExpensePayload): void {
    const current = this.selectedExpense();
    if (current) {
      this.store.annulExpense(current.id, payload, () => this.closeAnnulDialog());
    }
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.store.totalPages()) {
      this.store.loadPage(newPage);
    }
  }
}
