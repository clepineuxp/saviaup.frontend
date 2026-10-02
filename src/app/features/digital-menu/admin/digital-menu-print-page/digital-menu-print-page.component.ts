import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom, of, catchError } from 'rxjs';
import { AuthenticatedContextStore } from '../../../../core/context/authenticated-context.store';
import { SETTINGS_REPOSITORY } from '../../../settings/data-access/settings.repository';
import { DigitalMenuService } from '../../data-access/digital-menu.service';
import { DigitalMenuStore } from '../../data-access/digital-menu.store';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { LocalizationService } from '../../../../shared/i18n/localization.service';
import {
  buildPrintMenu,
  planPrintPages,
  PrintLayout,
  PrintMenu,
  PrintPage,
  renderPrintPage,
} from './print-menu-renderer';
import { loadOptionalProductPhoto, visiblePrintCategoryIds } from './print-menu-images';

type ExportFormat = 'pdf' | 'images';

@Component({
  selector: 'app-digital-menu-print-page',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './digital-menu-print-page.component.html',
  styleUrl: './digital-menu-print-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuPrintPageComponent {
  readonly store = inject(DigitalMenuStore);
  private readonly menuService = inject(DigitalMenuService);
  private readonly settingsRepository = inject(SETTINGS_REPOSITORY);
  private readonly context = inject(AuthenticatedContextStore);
  private readonly localization = inject(LocalizationService);

  readonly format = signal<ExportFormat>('pdf');
  readonly preparing = signal(false);
  readonly generating = signal(false);
  readonly prepared = signal(false);
  readonly confirmed = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly columns = signal<1 | 2 | 3>(1);
  readonly columnOptions = [1, 2, 3] as const;
  readonly fontPercent = signal(100);
  readonly previewPageIndex = signal(0);
  private readonly availableImageIds = signal<ReadonlySet<string> | null>(null);
  readonly layout = computed<PrintLayout>(() => ({
    columns: this.columns(),
    fontScale: this.fontPercent() / 100,
  }));

  readonly menu = computed<PrintMenu | null>(() => {
    const config = this.store.config();
    if (!config) return null;
    return buildPrintMenu(
      config,
      this.context.userInfo()?.organization.name ??
        this.localization.translate('modules.digital_menu'),
      this.localization.translate('digitalMenu.print.continued'),
    );
  });
  readonly pages = computed(() => {
    const menu = this.menu();
    return menu ? planPrintPages(menu, this.layout(), this.availableImageIds()) : [];
  });
  readonly productCount = computed(
    () =>
      this.menu()?.categories.reduce((total, category) => total + category.products.length, 0) ?? 0,
  );
  readonly variationCount = computed(
    () =>
      this.menu()?.categories.reduce(
        (total, category) =>
          total + category.products.reduce((sum, product) => sum + product.variations.length, 0),
        0,
      ) ?? 0,
  );
  readonly loadedImageCount = computed(() => this.availableImageIds()?.size ?? 0);

  private imageCache = new Map<string, HTMLImageElement>();
  private logoImage: HTMLImageElement | null = null;
  private preparedMenu: PrintMenu | null = null;
  private preparedPages: PrintPage[] = [];
  private preparedLayout: PrintLayout | null = null;

  constructor() {
    effect(() => {
      this.store.config();
      this.prepared.set(false);
      this.confirmed.set(false);
      this.previewUrl.set(null);
      this.previewPageIndex.set(0);
      this.availableImageIds.set(null);
      this.imageCache.clear();
      this.preparedMenu = null;
      this.preparedPages = [];
      this.preparedLayout = null;
    });
  }

  chooseFormat(format: ExportFormat): void {
    this.format.set(format);
    this.confirmed.set(false);
  }

  chooseColumns(columns: 1 | 2 | 3): void {
    if (columns === this.columns()) return;
    this.columns.set(columns);
    this.refreshLayoutPreview();
  }

  setFontPercent(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.fontPercent.set(Math.max(75, Math.min(125, value)));
    this.refreshLayoutPreview();
  }

  showPreviewPage(index: number): void {
    const menu = this.preparedMenu;
    const pages = this.preparedPages;
    const layout = this.preparedLayout;
    if (!menu || !layout || pages.length === 0) return;
    const pageIndex = Math.max(0, Math.min(pages.length - 1, index));
    this.previewPageIndex.set(pageIndex);
    this.previewUrl.set(
      renderPrintPage(
        menu,
        pages[pageIndex],
        pageIndex + 1,
        pages.length,
        this.imageCache,
        this.logoImage,
        layout,
      ).toDataURL('image/png'),
    );
  }

  private refreshLayoutPreview(): void {
    this.confirmed.set(false);
    if (!this.prepared() || this.preparing()) return;
    const menu = this.menu();
    const pages = this.pages();
    if (!menu || pages.length === 0) return;
    this.preparedMenu = menu;
    this.preparedPages = pages;
    this.preparedLayout = this.layout();
    this.showPreviewPage(0);
  }

  async prepare(): Promise<void> {
    const menu = this.menu();
    const pages = this.pages();
    const layout = this.layout();
    if (!menu || pages.length === 0 || this.preparing()) return;
    this.preparing.set(true);
    this.prepared.set(false);
    this.confirmed.set(false);
    this.error.set(null);

    try {
      const imageCache = new Map<string, HTMLImageElement>();
      if (menu.style.showImages) {
        const imageGroups = await Promise.all(
          visiblePrintCategoryIds(menu).map((categoryId) =>
            firstValueFrom(this.menuService.getPrintCategoryImages(categoryId)),
          ),
        );
        const imageSources = new Map(
          imageGroups.flatMap((group) =>
            group.products.map((product) => [product.productId, product.image ?? null] as const),
          ),
        );
        for (const category of menu.categories) {
          for (const product of category.products) {
            const image = await loadOptionalProductPhoto(imageSources.get(product.id), (source) =>
              this.loadImage(source),
            );
            if (image) imageCache.set(product.id, image);
          }
        }
      }

      const logoBlob = await firstValueFrom(
        this.settingsRepository.getLogo().pipe(catchError(() => of(null))),
      );
      let logo: HTMLImageElement | null = null;
      if (logoBlob && menu.style.logoPlacement !== 'none') {
        const url = URL.createObjectURL(logoBlob);
        try {
          logo = await loadOptionalProductPhoto(url, (source) => this.loadImage(source));
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      if (menu !== this.menu() || layout !== this.layout()) return;
      this.imageCache = imageCache;
      this.logoImage = logo;
      this.availableImageIds.set(new Set(imageCache.keys()));
      this.preparedMenu = menu;
      this.preparedPages = this.pages();
      this.preparedLayout = layout;
      this.showPreviewPage(0);
      this.prepared.set(true);
    } catch {
      this.error.set(this.localization.translate('digitalMenu.print.prepareError'));
    } finally {
      this.preparing.set(false);
    }
  }

  async download(): Promise<void> {
    if (!this.prepared() || !this.confirmed() || this.generating()) return;
    const menu = this.preparedMenu;
    const pages = this.preparedPages;
    const layout = this.preparedLayout;
    if (
      !menu ||
      !layout ||
      menu !== this.menu() ||
      layout !== this.layout() ||
      pages !== this.pages() ||
      pages.length === 0
    )
      return;
    this.generating.set(true);
    this.error.set(null);

    try {
      const filename = `menu-${
        (this.store.slug() || menu.organizationName)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-|-$/g, '') || 'digital'
      }`;

      if (this.format() === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pages.forEach((page, index) => {
          if (index > 0) document.addPage();
          const canvas = renderPrintPage(
            menu,
            page,
            index + 1,
            pages.length,
            this.imageCache,
            this.logoImage,
            layout,
          );
          document.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
        });
        this.downloadBlob(document.output('blob'), `${filename}.pdf`);
      } else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        for (const [index, page] of pages.entries()) {
          const canvas = renderPrintPage(
            menu,
            page,
            index + 1,
            pages.length,
            this.imageCache,
            this.logoImage,
            layout,
          );
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (result) =>
                result ? resolve(result) : reject(new Error('No se pudo generar la imagen.')),
              'image/png',
            );
          });
          zip.file(`pagina-${String(index + 1).padStart(2, '0')}.png`, blob);
        }
        this.downloadBlob(await zip.generateAsync({ type: 'blob' }), `${filename}-imagenes.zip`);
      }
      this.confirmed.set(false);
    } catch {
      this.error.set(this.localization.translate('digitalMenu.print.downloadError'));
    } finally {
      this.generating.set(false);
    }
  }

  private loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (!source.startsWith('data:') && !source.startsWith('blob:'))
        image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
      image.src = source;
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
