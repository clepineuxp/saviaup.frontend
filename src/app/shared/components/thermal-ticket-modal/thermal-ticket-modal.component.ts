import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { OrderReceipt } from '../../../features/billing/models/billing.model';
import { SettingsStore } from '../../../features/settings/data-access/settings-store.service';
import { DEFAULT_PRINTING_TEMPLATES } from '../../../features/settings/models/settings.model';
import { ThermalTicketContentComponent } from '../thermal-ticket-content/thermal-ticket-content.component';
import { ThermalTicketPrintService } from './thermal-ticket-print.service';

@Component({
  selector: 'app-thermal-ticket-modal',
  standalone: true,
  imports: [ThermalTicketContentComponent],
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
  private readonly printer = inject(ThermalTicketPrintService);
  private readonly ticketContent = viewChild<ElementRef<HTMLElement>>('ticketContent');
  readonly logoUrl = signal<string | null>(null);
  readonly printTemplate = computed(
    () => this.settingsStore.printingTemplates()?.receipt ?? DEFAULT_PRINTING_TEMPLATES.receipt,
  );

  ngOnInit(): void {
    this.settingsStore
      .load()
      .pipe(catchError(() => of(undefined)))
      .subscribe();
    this.settingsStore
      .getLogo()
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => this.logoUrl.set(String(reader.result));
        reader.readAsDataURL(blob);
      });
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  triggerPrint(): void {
    const host = this.ticketContent()?.nativeElement;
    if (!host) return;
    this.printer.print(host, this.printTemplate(), 'Impresión de Comprobante');
    this.printed.emit();
  }
}
