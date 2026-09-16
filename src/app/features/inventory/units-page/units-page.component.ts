import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { INVENTORY_COMPLEMENT_TYPES } from '../complement-types';
import { InventoryStore } from '../data-access/inventory-store.service';
import {
  CreateMeasurementUnitRequest,
  MeasurementUnit,
  MeasurementUnitQuery,
  UpdateMeasurementUnitRequest,
} from '../models/inventory.model';
import { InventoryDeleteDialogComponent } from '../shared/inventory-delete-dialog.component';
import { InventoryPaginationComponent } from '../shared/inventory-pagination.component';
import { UnitFormComponent } from '../unit-form/unit-form.component';

@Component({
  selector: 'app-units-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    InventoryDeleteDialogComponent,
    InventoryPaginationComponent,
    UnitFormComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './units-page.component.html',
  styleUrl: './units-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsPageComponent implements OnInit {
  readonly store = inject(InventoryStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly complementTypes = INVENTORY_COMPLEMENT_TYPES;
  readonly formOpen = signal(false);
  readonly editingUnit = signal<MeasurementUnit | null>(null);
  readonly deleteTarget = signal<MeasurementUnit | null>(null);
  readonly successKey = signal<string | null>(null);
  readonly canManage = computed(() => this.store.hasPermission('inventory.complements.manage'));
  readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    includeInactive: [false],
  });

  ngOnInit(): void {
    this.load(1);
  }

  applyFilters(): void {
    this.load(1);
  }

  changePage(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    if (!this.canManage()) return;
    this.store.clearOperationError();
    this.editingUnit.set(null);
    this.formOpen.set(true);
  }

  openEdit(unit: MeasurementUnit): void {
    if (!this.canManage()) return;
    this.store.clearOperationError();
    this.editingUnit.set(unit);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.store.mutating()) return;
    this.formOpen.set(false);
    this.editingUnit.set(null);
    this.store.clearOperationError();
  }

  save(request: CreateMeasurementUnitRequest | UpdateMeasurementUnitRequest): void {
    const editing = this.editingUnit();
    const operation = editing
      ? this.store.updateUnit(editing.id, request)
      : this.store.createUnit(request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingUnit.set(null);
        this.successKey.set(
          editing
            ? 'inventory.complements.units.success.updated'
            : 'inventory.complements.units.success.created',
        );
      },
      error: () => undefined,
    });
  }

  toggleStatus(unit: MeasurementUnit): void {
    if (!this.canManage()) return;
    this.store
      .setUnitStatus(unit.id, { isActive: !unit.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.successKey.set(
            unit.isActive
              ? 'inventory.complements.units.success.disabled'
              : 'inventory.complements.units.success.enabled',
          ),
        error: () => undefined,
      });
  }

  requestDelete(unit: MeasurementUnit): void {
    if (!this.canManage()) return;
    this.store.clearOperationError();
    this.deleteTarget.set(unit);
  }

  confirmDelete(): void {
    const unit = this.deleteTarget();
    if (!unit) return;
    this.store
      .deleteUnit(unit.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successKey.set('inventory.complements.units.success.deleted');
        },
        error: () => undefined,
      });
  }

  deactivateInstead(): void {
    const unit = this.deleteTarget();
    if (!unit) return;
    this.store
      .setUnitStatus(unit.id, { isActive: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.successKey.set('inventory.complements.units.success.disabled');
        },
        error: () => undefined,
      });
  }

  cancelDelete(): void {
    if (!this.store.mutating()) {
      this.deleteTarget.set(null);
      this.store.clearOperationError();
    }
  }

  retry(): void {
    this.load(this.store.unitsPage().page);
  }

  private load(page: number): void {
    const value = this.filters.getRawValue();
    const query: MeasurementUnitQuery = {
      page,
      pageSize: 20,
      search: value.search.trim() || null,
      includeInactive: value.includeInactive,
    };
    this.store
      .loadUnits(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
