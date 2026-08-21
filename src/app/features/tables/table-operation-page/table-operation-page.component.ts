import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { AppShellState } from '../../../layouts/app-layout/app-shell-state.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CanvasRoomViewComponent } from '../canvas-room-view/canvas-room-view.component';
import { TableStore } from '../data-access/table-store.service';
import { MetricsHeaderComponent } from '../metrics-header/metrics-header.component';
import { RestaurantTable, TableViewMode } from '../models/table.model';
import { TableCardComponent } from '../table-card/table-card.component';
import { TableOperationDialogComponent } from '../table-operation-dialog/table-operation-dialog.component';

@Component({
  selector: 'app-table-operation-page',
  imports: [
    CanvasRoomViewComponent,
    MetricsHeaderComponent,
    TableCardComponent,
    TableOperationDialogComponent,
    TranslatePipe,
  ],
  templateUrl: './table-operation-page.component.html',
  styleUrl: './table-operation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOperationPageComponent implements OnInit, OnDestroy {
  readonly store = inject(TableStore);
  readonly shellState = inject(AppShellState);
  readonly selectedTable = signal<RestaurantTable | null>(null);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly localization = inject(LocalizationService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.store
      .initializeOperation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((snapshot) => {
        if (snapshot.cashRegister.isInteractionBlocked) {
          const message =
            this.localization.translate('tables.cashGate.toast') ||
            'Debe abrir una caja para ingresar a vender';
          this.toastService.show(message, 'warning', 4000);
          void this.router.navigate(['/app/configuration/cash-registers/manage']);
        }
      });
  }

  ngOnDestroy(): void {
    this.shellState.showSidebar();
  }

  selectArea(event: Event): void {
    this.store.selectArea((event.target as HTMLSelectElement).value);
  }

  setViewMode(mode: TableViewMode): void {
    this.store.setViewMode(mode);
  }

  chooseTable(table: RestaurantTable): void {
    this.selectedTable.set(table);
  }

  openOrder(table: RestaurantTable): void {
    this.store
      .setOperation(table.id, { status: 'OCCUPIED', activeOrderTotal: 0 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe((updated) => this.selectedTable.set(updated));
  }

  closeOrder(table: RestaurantTable): void {
    this.store
      .setOperation(table.id, { status: 'AVAILABLE' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => this.selectedTable.set(null));
  }

  updateTotal(table: RestaurantTable, total: number): void {
    if (!table.activeOrderId) return;
    this.store
      .updateOrder(table.id, { activeOrderId: table.activeOrderId, total })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe((updated) => this.selectedTable.set(updated));
  }

  reloadOperationState(): void {
    this.store.initializeOperation().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
