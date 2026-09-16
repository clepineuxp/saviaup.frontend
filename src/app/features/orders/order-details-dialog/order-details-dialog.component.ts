import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Order } from '../models/order.model';

import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-order-details-dialog',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, TranslatePipe],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsDialogComponent {
  readonly order = input.required<Order>();
  readonly close = output<void>();
}
