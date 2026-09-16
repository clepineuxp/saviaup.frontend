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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableStore } from '../data-access/table-store.service';
import {
  DiningArea,
  RestaurantTable,
  RestaurantTableShape,
  RestaurantTableStatus,
  SaveRestaurantTableRequest,
} from '../models/table.model';
import {
  TableLayoutEditorComponent,
  TablePositionChange,
} from '../table-layout-editor/table-layout-editor.component';

@Component({
  selector: 'app-table-management-page',
  imports: [ReactiveFormsModule, TableLayoutEditorComponent, TranslatePipe],
  templateUrl: './table-management-page.component.html',
  styleUrl: './table-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableManagementPageComponent implements OnInit {
  readonly store = inject(TableStore);
  readonly editingArea = signal<DiningArea | null>(null);
  readonly editingTable = signal<RestaurantTable | null>(null);
  readonly areaFormOpen = signal(false);
  readonly tableFormOpen = signal(false);
  readonly pendingAreaDelete = signal<DiningArea | null>(null);
  readonly pendingTableDelete = signal<RestaurantTable | null>(null);
  readonly selectedLayoutAreaId = signal<string | null>(null);
  readonly selectedLayoutArea = computed(
    () =>
      this.store.areas().find((area) => area.id === this.selectedLayoutAreaId()) ??
      this.store.areas()[0] ??
      null,
  );
  readonly layoutTables = computed(() => {
    const areaId = this.selectedLayoutArea()?.id;
    return areaId ? this.store.tables().filter((table) => table.diningAreaId === areaId) : [];
  });
  private readonly destroyRef = inject(DestroyRef);

  readonly areaForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    order: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });
  readonly tableForm = new FormGroup({
    diningAreaId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    capacity: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)],
    }),
    shape: new FormControl<RestaurantTableShape>('SQUARE', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    isDelivery: new FormControl(false, { nonNullable: true }),
    isCashRegister: new FormControl(false, { nonNullable: true }),
    status: new FormControl<RestaurantTableStatus>('AVAILABLE', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.store
      .ensurePermissions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.store
          .loadConfiguration()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.ensureLayoutArea());
      });
  }

  newArea(): void {
    this.editingArea.set(null);
    this.areaForm.reset({ name: '', order: this.store.areas().length + 1, isActive: true });
    this.areaFormOpen.set(true);
  }

  editArea(area: DiningArea): void {
    this.editingArea.set(area);
    this.areaForm.reset({ name: area.name, order: area.order, isActive: area.isActive });
    this.areaFormOpen.set(true);
  }

  saveArea(): void {
    if (this.areaForm.invalid) {
      this.areaForm.markAllAsTouched();
      return;
    }
    const request = this.areaForm.getRawValue();
    const editing = this.editingArea();
    const operation = editing
      ? this.store.updateArea(editing.id, request)
      : this.store.createArea(request);
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.areaFormOpen.set(false);
        this.ensureLayoutArea();
      });
  }

  moveArea(area: DiningArea, direction: -1 | 1): void {
    const ids = this.store.areas().map((item) => item.id);
    const index = ids.indexOf(area.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.store
      .reorderAreas(ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  confirmDeleteArea(): void {
    const area = this.pendingAreaDelete();
    if (!area) return;
    this.store
      .deleteArea(area.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.pendingAreaDelete.set(null);
        this.ensureLayoutArea();
      });
  }

  newTable(): void {
    this.editingTable.set(null);
    this.tableForm.reset({
      diningAreaId: this.selectedLayoutArea()?.id ?? this.store.areas()[0]?.id ?? '',
      name: '',
      capacity: 2,
      shape: 'SQUARE',
      isDelivery: false,
      isCashRegister: false,
      status: 'AVAILABLE',
    });
    this.tableFormOpen.set(true);
  }

  editTable(table: RestaurantTable): void {
    this.editingTable.set(table);
    this.tableForm.reset({
      diningAreaId: table.diningAreaId,
      name: table.name,
      capacity: table.capacity,
      shape: table.shape,
      isDelivery: table.isDelivery,
      isCashRegister: table.isCashRegister,
      status: table.status,
    });
    this.tableFormOpen.set(true);
  }

  saveTable(): void {
    if (this.tableForm.invalid) {
      this.tableForm.markAllAsTouched();
      return;
    }
    const editing = this.editingTable();
    const formValue = this.tableForm.getRawValue();
    const position = editing
      ? { x: editing.positionX, y: editing.positionY }
      : this.nextTablePosition(formValue.diningAreaId);
    const request: SaveRestaurantTableRequest = {
      ...formValue,
      positionX: position.x,
      positionY: position.y,
    };
    const operation = editing
      ? this.store.updateTable(editing.id, request)
      : this.store.createTable(request);
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => this.tableFormOpen.set(false));
  }

  selectLayoutArea(event: Event): void {
    this.selectedLayoutAreaId.set((event.target as HTMLSelectElement).value);
  }

  savePosition(change: TablePositionChange): void {
    const table = change.table;
    this.store
      .updateTable(table.id, {
        diningAreaId: table.diningAreaId,
        name: table.name,
        capacity: table.capacity,
        positionX: change.positionX,
        positionY: change.positionY,
        shape: table.shape,
        isDelivery: table.isDelivery,
        isCashRegister: table.isCashRegister,
        status: table.status,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.store
            .loadConfiguration()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: () => undefined });
          return EMPTY;
        }),
      )
      .subscribe();
  }

  requestDeleteFromForm(): void {
    const table = this.editingTable();
    if (!table) return;
    this.tableFormOpen.set(false);
    this.pendingTableDelete.set(table);
  }

  confirmDeleteTable(): void {
    const table = this.pendingTableDelete();
    if (!table) return;
    this.store
      .deleteTable(table.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => this.pendingTableDelete.set(null));
  }

  areaName(areaId: string): string {
    return this.store.areas().find((area) => area.id === areaId)?.name ?? '—';
  }

  private ensureLayoutArea(): void {
    const areas = this.store.areas();
    if (!areas.some((area) => area.id === this.selectedLayoutAreaId()))
      this.selectedLayoutAreaId.set(areas[0]?.id ?? null);
  }

  private nextTablePosition(areaId: string): { x: number; y: number } {
    const index = this.store.tables().filter((table) => table.diningAreaId === areaId).length;
    return { x: (index % 4) * 190, y: Math.floor(index / 4) * 190 };
  }
}
