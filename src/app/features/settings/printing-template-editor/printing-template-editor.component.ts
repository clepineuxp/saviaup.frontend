import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
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
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './printing-template-editor.component.html',
  styleUrl: './printing-template-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintingTemplateEditorComponent {
  readonly store = inject(SettingsStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly receiptPreviewElement = viewChild<ElementRef<HTMLElement>>('receiptPreview');

  readonly editor = signal<'receipt' | 'kitchen'>('receipt');
  readonly selectedPrinterId = signal('');
  readonly feedbackKey = signal<string | null>(null);
  readonly localTemplates = signal<PrintingTemplateSettings>(DEFAULT_PRINTING_TEMPLATES);

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
    logoWidthMm: [48, [Validators.required, Validators.min(20), Validators.max(72)]],
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
    const preview = this.receiptPreviewElement()?.nativeElement;
    if (!preview) return;
    const template = this.currentValue().receipt;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return frame.remove();
    doc.open();
    doc.write(`<!doctype html><html><head><title>Prueba de comprobante</title><style>
      @page{margin:0;size:${template.paperWidthMm}mm auto}body{margin:0;padding:4mm 2mm;font-family:monospace;color:#000;background:#fff}
      .receipt-preview{box-sizing:border-box;width:100%!important;max-width:none!important;box-shadow:none!important;border:0!important;padding:0!important}
      ${this.receiptPrintCss(template)}
    </style></head><body>${preview.outerHTML}</body></html>`);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 200);
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

  private receiptPrintCss(template: ReceiptPrintTemplate): string {
    return `.receipt-preview{font-size:${template.baseFontSize}px}.receipt-header{font-size:${template.headerFontSize}px}.receipt-item{font-size:${template.itemFontSize}px}.receipt-total{font-size:${template.totalFontSize}px}.receipt-tip{font-size:${template.voluntaryTipFontSize}px;text-align:${template.voluntaryTipAlignment.toLowerCase()}}.receipt-item-name{${template.wrapLongItemNames ? 'white-space:normal;overflow-wrap:anywhere' : 'white-space:nowrap;overflow:hidden'}}`;
  }
}
