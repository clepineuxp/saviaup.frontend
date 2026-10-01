import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { OrderReceipt } from '../../billing/models/billing.model';
import { ThermalTicketContentComponent } from '../../../shared/components/thermal-ticket-content/thermal-ticket-content.component';
import { ThermalTicketPrintService } from '../../../shared/components/thermal-ticket-modal/thermal-ticket-print.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SettingsStore } from '../data-access/settings-store.service';
import {
  DEFAULT_PRINTING_TEMPLATES,
  KitchenPrintLayout,
  KitchenPrintTemplate,
  PrintAlignment,
  PrintingTemplateSettings,
  ReceiptPrintTemplate,
  VoluntaryTipPosition,
} from '../models/settings.model';

@Component({
  selector: 'app-printing-template-editor',
  imports: [ReactiveFormsModule, TranslatePipe, ThermalTicketContentComponent],
  templateUrl: './printing-template-editor.component.html',
  styleUrl: './printing-template-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintingTemplateEditorComponent implements OnInit {
  readonly store = inject(SettingsStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly printer = inject(ThermalTicketPrintService);
  private readonly receiptPreviewElement = viewChild<ElementRef<HTMLElement>>('receiptPreview');

  readonly editor = signal<'receipt' | 'kitchen'>('receipt');
  readonly selectedPrinterId = signal('');
  readonly feedbackKey = signal<string | null>(null);
  readonly logoUrl = signal<string | null>(null);
  readonly localTemplates = signal<PrintingTemplateSettings>(DEFAULT_PRINTING_TEMPLATES);
  readonly sampleReceipt: OrderReceipt = {
    id: 'printing-template-preview',
    tenantId: 'printing-template-preview',
    orderId: 'printing-template-preview',
    receiptNumber: 1458,
    receiptType: 'PAYMENT',
    title: 'COMPROBANTE DE PAGO',
    subtotalAmount: 54600,
    taxAmount: 0,
    tipAmount: 5460,
    totalAmount: 60060,
    paymentMethod: 'Efectivo',
    paymentDetails: [{ method: 'Efectivo', amount: 60060 }],
    items: [
      { productName: 'AMERICANO', quantity: 1, unitPrice: 6900, subtotal: 6900 },
      { productName: 'CAPPUCCINO', quantity: 1, unitPrice: 10900, subtotal: 10900 },
      { productName: 'LIMONADA DE COCO', quantity: 1, unitPrice: 12900, subtotal: 12900 },
      {
        productName: 'BOHEMIAN BIANCA CON NOMBRE LARGO DE PRUEBA',
        quantity: 1,
        unitPrice: 23900,
        subtotal: 23900,
      },
    ],
    issuedByUserId: 'printing-template-preview',
    issuedByUserName: 'Marisol Chica',
    paidByUserName: 'Marisol Chica',
    createdAt: new Date().toISOString(),
    orderNumber: 321,
    tableName: 'Mesa 8',
  };

  readonly receiptForm = this.fb.nonNullable.group({
    paperWidthMm: [80, [Validators.required]],
    baseFontSize: [11, [Validators.required, Validators.min(8), Validators.max(18)]],
    headerFontSize: [13, [Validators.required, Validators.min(10), Validators.max(28)]],
    itemFontSize: [11, [Validators.required, Validators.min(8), Validators.max(22)]],
    totalFontSize: [13, [Validators.required, Validators.min(10), Validators.max(28)]],
    voluntaryTipFontSize: [11, [Validators.required, Validators.min(8), Validators.max(24)]],
    voluntaryTipAlignment: ['LEFT'],
    voluntaryTipPosition: ['BEFORE_TOTAL'],
    wrapLongItemNames: [true],
    showLogo: [true],
  });

  readonly kitchenForm = this.fb.nonNullable.group({
    headerFontScale: [2],
    metadataFontScale: [1],
    itemFontScale: [1],
    notesFontScale: [1],
    headerAlignment: ['CENTER'],
    layout: ['STANDARD'],
    wrapLongItemNames: [true],
    maxItemNameLines: [2],
    showTable: [true],
    showWaiter: [true],
    showTimestamp: [true],
    uppercaseItemNames: [false],
  });

  constructor() {
    effect(() => {
      const settings = this.store.printingTemplates();
      if (!settings) return;
      this.localTemplates.set(settings);
      this.receiptForm.patchValue(settings.receipt, { emitEvent: false });
      this.kitchenForm.patchValue(settings.kitchen, { emitEvent: false });
    });
    this.receiptForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncLocal());
    this.kitchenForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncLocal());
  }

  ngOnInit(): void {
    this.store
      .getLogo()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => this.logoUrl.set(String(reader.result));
        reader.readAsDataURL(blob);
      });
  }

  save(): void {
    if (!this.store.hasPermission('settings.business.manage')) return;
    if (this.receiptForm.invalid || this.kitchenForm.invalid) {
      this.receiptForm.markAllAsTouched();
      this.kitchenForm.markAllAsTouched();
      return;
    }
    this.store
      .updatePrintingTemplates(this.currentValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.feedbackKey.set('settings.printing.saved'),
        error: () => undefined,
      });
  }

  testReceipt(): void {
    const host = this.receiptPreviewElement()?.nativeElement;
    if (!host) return;
    this.printer.print(host, this.currentValue().receipt, 'Prueba de comprobante');
  }

  testKitchen(): void {
    if (!this.store.hasPermission('settings.business.manage')) return;
    const printer = this.store
      .printingPrinters()
      .find((item) => item.id === this.selectedPrinterId());
    if (!printer) return;
    this.store
      .updatePrintingTemplates(this.currentValue())
      .pipe(
        switchMap(() => this.store.testKitchenPrint(printer.printAgentId, printer.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.feedbackKey.set('settings.printing.testQueued'),
        error: () => undefined,
      });
  }

  selectPrinter(event: Event): void {
    this.selectedPrinterId.set((event.target as HTMLSelectElement).value);
  }

  receipt(): ReceiptPrintTemplate {
    return this.localTemplates().receipt;
  }

  kitchen(): KitchenPrintTemplate {
    return this.localTemplates().kitchen;
  }

  private syncLocal(): void {
    this.localTemplates.set(this.currentValue());
    this.feedbackKey.set(null);
  }

  private currentValue(): PrintingTemplateSettings {
    const receipt = this.receiptForm.getRawValue();
    const kitchen = this.kitchenForm.getRawValue();
    return {
      receipt: {
        ...receipt,
        paperWidthMm: receipt.paperWidthMm === 58 ? 58 : 80,
        voluntaryTipAlignment: receipt.voluntaryTipAlignment as PrintAlignment,
        voluntaryTipPosition: receipt.voluntaryTipPosition as VoluntaryTipPosition,
      },
      kitchen: {
        ...kitchen,
        headerFontScale: kitchen.headerFontScale === 2 ? 2 : 1,
        metadataFontScale: kitchen.metadataFontScale === 2 ? 2 : 1,
        itemFontScale: kitchen.itemFontScale === 2 ? 2 : 1,
        notesFontScale: kitchen.notesFontScale === 2 ? 2 : 1,
        maxItemNameLines:
          kitchen.maxItemNameLines === 1 ? 1 : kitchen.maxItemNameLines === 3 ? 3 : 2,
        headerAlignment: kitchen.headerAlignment as PrintAlignment,
        layout: kitchen.layout as KitchenPrintLayout,
      },
    };
  }
}
