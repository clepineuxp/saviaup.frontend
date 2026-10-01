import { OrganizationDatePipe } from '../../pipes/organization-date.pipe';
import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { OrderReceipt } from '../../../features/billing/models/billing.model';
import { SettingsStore } from '../../../features/settings/data-access/settings-store.service';
import { DEFAULT_PRINTING_TEMPLATES } from '../../../features/settings/models/settings.model';

@Component({
  selector: 'app-thermal-ticket-modal',
  standalone: true,
  imports: [OrganizationDatePipe, CurrencyPipe],
  templateUrl: './thermal-ticket-modal.component.html',
  styleUrl: './thermal-ticket-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThermalTicketModalComponent implements OnInit {
  readonly receipt = input.required<OrderReceipt>();
  readonly tableName = input<string>('');
  readonly orderNumber = input<number | string>('');

  readonly closed = output<void>();
  readonly printed = output<void>();

  readonly settingsStore = inject(SettingsStore);
  readonly logoUrl = signal<string | null>(null);
  readonly printTemplate = computed(
    () => this.settingsStore.printingTemplates()?.receipt ?? DEFAULT_PRINTING_TEMPLATES.receipt,
  );

  ngOnInit(): void {
    this.settingsStore.load().subscribe();
    this.settingsStore
      .getLogo()
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            this.logoUrl.set(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      });
  }

  get EffectiveTableName(): string {
    if (this.tableName()) return this.tableName();
    const contextualReceipt = this.receipt() as OrderReceipt & { readonly tableName?: string };
    return contextualReceipt.tableName || 'Sin Mesa';
  }

  get EffectiveOrderNumber(): string {
    if (this.orderNumber()) return String(this.orderNumber());
    const contextualReceipt = this.receipt() as OrderReceipt & {
      readonly orderNumber?: number | string;
    };
    return contextualReceipt.orderNumber ? String(contextualReceipt.orderNumber) : '-';
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  triggerPrint(): void {
    const printableElement = document.querySelector('.thermal-ticket-container.printable-area');
    if (!printableElement) {
      window.print();
      this.printed.emit();
      return;
    }

    const ticketHtml = printableElement.innerHTML;
    const template = this.printTemplate();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      this.printed.emit();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impresión de Comprobante</title>
          <style>
            @page {
              margin: 0;
              size: ${template.paperWidthMm}mm auto;
            }
            body {
              margin: 0;
              padding: 4mm 2mm;
              width: ${template.paperWidthMm}mm;
              font-family: monospace, 'Courier New', Courier;
              font-size: ${template.baseFontSize}px;
              color: #000000;
              background: #ffffff;
              box-sizing: border-box;
            }
            .ticket-logo-wrap {
              text-align: center;
              margin-bottom: 0.3rem;
            }
            .ticket-logo-img {
              max-width: ${template.logoWidthMm}mm;
              max-height: 24mm;
              object-fit: contain;
            }
            .ticket-header-block {
              text-align: center;
              line-height: 1.25;
            }
            .commerce-name {
              font-size: ${template.headerFontSize}px;
              font-weight: 900;
              margin: 0 0 0.15rem 0;
              text-transform: uppercase;
            }
            .ticket-header-line {
              font-size: 10px;
            }
            .ticket-divider-dash {
              text-align: center;
              letter-spacing: -1px;
              font-weight: bold;
              margin: 0.25rem 0;
              overflow: hidden;
              white-space: nowrap;
            }
            .ticket-meta-block {
              line-height: 1.3;
            }
            .ticket-meta-line {
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
            }
            .ticket-items-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 10.5px;
              margin-bottom: 0.15rem;
            }
            .ticket-item-row {
              display: flex;
              justify-content: space-between;
              font-size: ${template.itemFontSize}px;
              font-weight: bold;
              margin: 0.15rem 0;
            }
            .t-item-name {
              padding-right: 0.5rem;
              ${template.wrapLongItemNames ? 'white-space: normal; overflow-wrap: anywhere;' : 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'}
            }
            .t-item-val {
              white-space: nowrap;
            }
            .ticket-totals-block {
              line-height: 1.3;
            }
            .ticket-total-line {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .total-grand {
              font-size: ${template.totalFontSize}px;
              font-weight: 900;
              margin-top: 0.2rem;
            }
            .ticket-payment-methods-block {
              display: flex;
              flex-direction: column;
              gap: 0.2rem;
            }
            .payment-split-line {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .ticket-footer-block {
              text-align: center;
              margin-top: 0.5rem;
            }
            .voluntary-tip-line {
              font-size: ${template.voluntaryTipFontSize}px;
              text-align: ${template.voluntaryTipAlignment.toLowerCase()};
              display: block;
            }
            .voluntary-tip-line span:last-child {
              display: inline-block;
              margin-left: 0.5rem;
            }
            .ticket-footer-title {
              font-size: 12px;
              font-weight: 900;
              margin: 0 0 0.2rem 0;
            }
            .ticket-footer-msg {
              font-size: 11px;
              margin: 0 0 0.2rem 0;
            }
            .ticket-software-credit {
              font-size: 9px;
              color: #444444;
            }
          </style>
        </head>
        <body>
          ${ticketHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
      this.printed.emit();
    }, 250);
  }
}
