import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderReceipt } from '../../../features/billing/models/billing.model';
import {
  BusinessSettings,
  OrganizationSettings,
  ReceiptPrintTemplate,
} from '../../../features/settings/models/settings.model';
import { OrganizationDatePipe } from '../../pipes/organization-date.pipe';

@Component({
  selector: 'app-thermal-ticket-content',
  imports: [CurrencyPipe, OrganizationDatePipe],
  templateUrl: './thermal-ticket-content.component.html',
  styleUrl: './thermal-ticket-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThermalTicketContentComponent {
  readonly receipt = input.required<OrderReceipt>();
  readonly template = input.required<ReceiptPrintTemplate>();
  readonly organization = input<OrganizationSettings | null>(null);
  readonly business = input<BusinessSettings | null>(null);
  readonly logoUrl = input<string | null>(null);
  readonly tableName = input<string>('');
  readonly orderNumber = input<number | string>('');

  readonly effectiveTableName = computed(
    () => this.tableName() || this.receipt().tableName || 'Sin Mesa',
  );
  readonly effectiveOrderNumber = computed(() =>
    String(this.orderNumber() || this.receipt().orderNumber || '-'),
  );
}
