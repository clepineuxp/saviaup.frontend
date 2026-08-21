import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableMetrics } from '../models/table.model';

@Component({
  selector: 'app-metrics-header',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './metrics-header.component.html',
  styleUrl: './metrics-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsHeaderComponent {
  readonly metrics = input.required<TableMetrics>();
}
