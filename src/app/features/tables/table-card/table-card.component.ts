import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { RestaurantTable } from '../models/table.model';
import { tableShapeDimensions } from '../models/table-shape';

@Component({
  selector: 'app-table-card',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './table-card.component.html',
  styleUrl: './table-card.component.scss',
  host: {
    '[style.width.px]': 'dimensions().width',
    '[style.height.px]': 'dimensions().height',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCardComponent {
  readonly table = input.required<RestaurantTable>();
  readonly interactive = input(true);
  readonly selected = output<RestaurantTable>();
  readonly dimensions = computed(() => tableShapeDimensions(this.table().shape));

  selectTable(): void {
    if (this.interactive()) {
      this.selected.emit(this.table());
    }
  }
}
