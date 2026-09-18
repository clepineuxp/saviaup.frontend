import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DigitalMenuStore } from '../../data-access/digital-menu.store';
import {
  DigitalMenuHeaderAlignment,
  DigitalMenuInfoPlacement,
  DigitalMenuLogoPlacement,
  DigitalMenuTemplateId,
} from '../../models/digital-menu.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

interface PresetPalette {
  name: string;
  templateId: DigitalMenuTemplateId;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  selectedButtonText: string;
  font: string;
}

type StylePanel = 'presets' | 'template' | 'alignment' | 'colors' | 'typography' | 'content';

@Component({
  selector: 'app-digital-menu-style-page',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './digital-menu-style-page.component.html',
  styleUrl: './digital-menu-style-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuStylePageComponent {
  readonly store = inject(DigitalMenuStore);

  readonly previewDevice = signal<'mobile' | 'desktop'>('mobile');
  readonly openPanel = signal<StylePanel | null>('template');
  readonly previewExpandedCategory = signal<string | null>(null);
  readonly previewProductName = signal<string | null>(null);

  readonly presetPalettes: readonly PresetPalette[] = [
    {
      name: 'Bistro Esmeralda',
      templateId: 'bistro',
      primary: '#10b981',
      accent: '#f59e0b',
      bg: '#ffffff',
      text: '#0f172a',
      selectedButtonText: '#ffffff',
      font: 'Inter',
    },
    {
      name: 'Gourmet Nocturno',
      templateId: 'gourmet',
      primary: '#d97706',
      accent: '#f59e0b',
      bg: '#0f172a',
      text: '#f8fafc',
      selectedButtonText: '#ffffff',
      font: 'Playfair Display',
    },
    {
      name: 'Hero Sunset',
      templateId: 'showcase',
      primary: '#ea580c',
      accent: '#facc15',
      bg: '#fcfaf7',
      text: '#1c1917',
      selectedButtonText: '#ffffff',
      font: 'Outfit',
    },
  ];

  readonly currentStyle = computed(() => this.store.style());
  readonly previewUsesCollapsibleCategories = computed(() => {
    const template = this.currentStyle().templateId;
    return template === 'gourmet' || template === 'gourmet-hero';
  });

  readonly sampleCategories = computed(() => [
    {
      name: 'Platos Fuertes',
      products: [
        { name: 'Hamburguesa Artesanal', desc: 'Carne angus, queso cheddar y salsa especial', price: 28000 },
        { name: 'Costillas BBQ', desc: 'Bañadas en salsa ahumada con papas rústicas', price: 36000 },
      ],
    },
    {
      name: 'Bebidas',
      products: [
        { name: 'Limonada de Coco', desc: 'Refrescante con crema de coco natural', price: 12000 },
        { name: 'Cerveza Artesanal', desc: 'Rubia o roja de la casa', price: 14000 },
      ],
    },
  ]);

  setTemplate(templateId: DigitalMenuTemplateId): void {
    this.store.updateStyleLocally({ templateId });
    this.previewExpandedCategory.set(null);
  }

  applyPreset(preset: PresetPalette): void {
    this.store.updateStyleLocally({
      templateId: preset.templateId,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      backgroundColor: preset.bg,
      textColor: preset.text,
      selectedButtonTextColor: preset.selectedButtonText,
      fontFamily: preset.font,
    });
  }

  updatePrimaryColor(color: string): void {
    this.store.updateStyleLocally({ primaryColor: color });
  }

  updateAccentColor(color: string): void {
    this.store.updateStyleLocally({ accentColor: color });
  }

  updateBgColor(color: string): void {
    this.store.updateStyleLocally({ backgroundColor: color });
  }

  updateTextColor(color: string): void {
    this.store.updateStyleLocally({ textColor: color });
  }

  updateSelectedButtonTextColor(color: string): void {
    this.store.updateStyleLocally({ selectedButtonTextColor: color });
  }

  updateFont(font: string): void {
    this.store.updateStyleLocally({ fontFamily: font });
  }

  updateWelcome(msg: string): void {
    this.store.updateStyleLocally({ welcomeMessage: msg });
  }

  updateBanner(bannerUrl: string): void {
    this.store.updateStyleLocally({ bannerUrl });
  }

  updateHeaderAlignment(headerAlignment: DigitalMenuHeaderAlignment): void {
    this.store.updateStyleLocally({ headerAlignment });
  }

  updateInfoPlacement(infoPlacement: DigitalMenuInfoPlacement): void {
    this.store.updateStyleLocally({ infoPlacement });
  }

  updateLogoPlacement(logoPlacement: DigitalMenuLogoPlacement): void {
    this.store.updateStyleLocally({ logoPlacement });
  }

  toggleLogo(): void {
    this.store.updateStyleLocally({
      logoPlacement: this.currentStyle().logoPlacement === 'none' ? 'header' : 'none',
    });
  }

  toggleShowImages(): void {
    const curr = this.currentStyle().showImages;
    this.store.updateStyleLocally({ showImages: !curr });
  }

  togglePanel(panel: StylePanel): void {
    this.openPanel.update((current) => (current === panel ? null : panel));
  }

  isPanelOpen(panel: StylePanel): boolean {
    return this.openPanel() === panel;
  }

  selectPreviewCategory(categoryName: string): void {
    if (!this.previewUsesCollapsibleCategories()) return;
    this.previewExpandedCategory.update((current) => (current === categoryName ? null : categoryName));
  }

  isPreviewCategoryOpen(categoryName: string): boolean {
    return !this.previewUsesCollapsibleCategories() || this.previewExpandedCategory() === categoryName;
  }

  openPreviewProduct(name: string): void {
    this.previewProductName.set(name);
  }

  closePreviewProduct(): void {
    this.previewProductName.set(null);
  }

  onPreviewModalKeyup(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closePreviewProduct();
    }
  }

  save(): void {
    this.store.saveStyle();
  }
}
