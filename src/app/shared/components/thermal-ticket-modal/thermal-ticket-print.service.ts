import { Injectable } from '@angular/core';
import { ReceiptPrintTemplate } from '../../../features/settings/models/settings.model';

@Injectable({ providedIn: 'root' })
export class ThermalTicketPrintService {
  print(host: HTMLElement, template: ReceiptPrintTemplate, title: string): void {
    const source = host.matches('.thermal-ticket-container')
      ? host
      : host.querySelector<HTMLElement>('.thermal-ticket-container');
    if (!source) return window.print();

    const printable = source.cloneNode(true) as HTMLElement;
    this.copyComputedStyles(source, printable);
    printable.style.width = `${template.paperWidthMm}mm`;
    printable.style.maxWidth = 'none';
    printable.style.borderRadius = '0';
    printable.style.boxShadow = 'none';

    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return window.print();
    }

    doc.open();
    doc.write(`<!doctype html><html><head><title>${this.escape(title)}</title><style>
      @page{margin:0;size:${template.paperWidthMm}mm auto}
      html,body{margin:0;padding:0;width:${template.paperWidthMm}mm;background:#fff}
      body{overflow:visible}
    </style></head><body></body></html>`);
    doc.close();
    doc.body.appendChild(printable);

    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
  }

  private copyComputedStyles(source: Element, target: Element): void {
    if (source instanceof HTMLElement && target instanceof HTMLElement) {
      const computed = getComputedStyle(source);
      for (let index = 0; index < computed.length; index++) {
        const property = computed.item(index);
        target.style.setProperty(
          property,
          computed.getPropertyValue(property),
          computed.getPropertyPriority(property),
        );
      }
    }

    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);
    sourceChildren.forEach((child, index) => {
      const targetChild = targetChildren[index];
      if (targetChild) this.copyComputedStyles(child, targetChild);
    });
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character] ?? character;
    });
  }
}
