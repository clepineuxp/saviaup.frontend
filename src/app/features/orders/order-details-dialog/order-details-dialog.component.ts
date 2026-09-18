import { OrganizationDatePipe } from '../../../shared/pipes/organization-date.pipe';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Order } from '../models/order.model';

import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-order-details-dialog',
  standalone: true,
  imports: [OrganizationDatePipe, CommonModule, CurrencyPipe, TranslatePipe],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsDialogComponent {
  readonly order = input.required<Order>();
  readonly close = output<void>();
}
