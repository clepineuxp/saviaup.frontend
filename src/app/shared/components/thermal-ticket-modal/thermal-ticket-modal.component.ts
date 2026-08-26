import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { OrderReceipt } from '../../../features/billing/models/billing.model';
import { SettingsStore } from '../../../features/settings/data-access/settings-store.service';

@Component({
  selector: 'app-thermal-ticket-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
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
    return (this.receipt() as any).tableName || 'Sin Mesa';
  }

  get EffectiveOrderNumber(): string {
    if (this.orderNumber()) return String(this.orderNumber());
    return (this.receipt() as any).orderNumber ? String((this.receipt() as any).orderNumber) : '-';
  }

  triggerPrint(): void {
    const printableElement = document.querySelector('.thermal-ticket-container.printable-area');
    if (!printableElement) {
      window.print();
      this.printed.emit();
      return;
    }

    const ticketHtml = printableElement.innerHTML;
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
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 4mm 2mm;
              width: 80mm;
              font-family: monospace, 'Courier New', Courier;
              font-size: 11px;
              color: #000000;
              background: #ffffff;
              box-sizing: border-box;
            }
            .ticket-logo-wrap {
              text-align: center;
              margin-bottom: 0.3rem;
            }
            .ticket-logo-img {
              max-width: 48mm;
              max-height: 24mm;
              object-fit: contain;
            }
            .ticket-header-block {
              text-align: center;
              line-height: 1.25;
            }
            .commerce-name {
              font-size: 13px;
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
              font-size: 11px;
              font-weight: bold;
              margin: 0.15rem 0;
            }
            .t-item-name {
              padding-right: 0.5rem;
              word-break: break-word;
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
              font-size: 13px;
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
