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
import { SupplierStoreService } from '../data-access/supplier-store.service';
import { Supplier } from '../models/supplier.model';
import { CreateSupplierPayload, UpdateSupplierPayload } from '../data-access/supplier.contracts';
import { SupplierFormDialogComponent } from '../supplier-form-dialog/supplier-form-dialog.component';

@Component({
  selector: 'app-suppliers-page',
  imports: [
    CommonModule,
    FormsModule,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
    SupplierFormDialogComponent,
  ],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersPageComponent implements OnInit {
  readonly store = inject(SupplierStoreService);

  readonly showDialog = signal(false);
  readonly selectedSupplier = signal<Supplier | null>(null);

  readonly searchInput = signal<string>('');
  readonly filterStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  ngOnInit(): void {
    this.store.loadPage(1);
  }

  applyFilters(): void {
    const activeVal =
      this.filterStatus() === 'ACTIVE'
        ? true
        : this.filterStatus() === 'INACTIVE'
        ? false
        : undefined;

    this.store.setFilters(this.searchInput(), activeVal);
  }

  setFilterStatus(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.filterStatus.set(status);
    this.applyFilters();
  }

  openCreateDialog(): void {
    this.selectedSupplier.set(null);
    this.showDialog.set(true);
  }

  openEditDialog(supplier: Supplier): void {
    this.selectedSupplier.set(supplier);
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.selectedSupplier.set(null);
  }

  handleFormSubmit(payload: CreateSupplierPayload | UpdateSupplierPayload): void {
    const current = this.selectedSupplier();
    if (current) {
      this.store.updateSupplier(current.id, payload as UpdateSupplierPayload, () =>
        this.closeDialog()
      );
    } else {
      this.store.createSupplier(payload as CreateSupplierPayload, () =>
        this.closeDialog()
      );
    }
  }

  toggleStatus(supplier: Supplier): void {
    this.store.toggleSupplierStatus(supplier.id, !supplier.isActive);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.store.totalPages()) {
      this.store.loadPage(newPage);
    }
  }
}
