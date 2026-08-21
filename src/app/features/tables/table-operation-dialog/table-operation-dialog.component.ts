import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { RestaurantTable } from '../models/table.model';

@Component({
  selector: 'app-table-operation-dialog',
  imports: [CurrencyPipe, ReactiveFormsModule, TranslatePipe],
  templateUrl: './table-operation-dialog.component.html',
  styleUrl: './table-operation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOperationDialogComponent {
  readonly table = input.required<RestaurantTable>();
  readonly blocked = input(false);
  readonly canOperate = input(false);
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly opened = output<void>();
  readonly released = output<void>();
  readonly totalUpdated = output<number>();
  readonly total = new FormControl(0, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0)],
  });

  constructor() {
    effect(() => this.total.setValue(this.table().activeOrderTotal, { emitEvent: false }));
  }

  updateTotal(): void {
    if (this.total.valid) this.totalUpdated.emit(this.total.value);
  }
}
