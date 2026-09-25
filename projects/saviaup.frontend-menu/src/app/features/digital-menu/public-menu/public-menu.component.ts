import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DigitalMenuLayoutComponent } from '../../../layouts/digital-menu-layout/digital-menu-layout.component';
import { PublicProduct, PublicProductComboGroup } from '../models/public-digital-menu.model';

@Component({
  selector: 'app-public-menu',
  imports: [CommonModule, FormsModule],
  templateUrl: './public-menu.component.html',
  styleUrl: './public-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicMenuComponent {
  readonly layout = inject(DigitalMenuLayoutComponent);

  readonly menu = this.layout.menu;
  readonly searchQuery = signal<string>('');
  readonly activeCategoryId = signal<string | null>(null);
  readonly expandedCategoryId = signal<string | null>(null);
  readonly selectedProduct = signal<PublicProduct | null>(null);
  readonly categoriesMenuOpen = signal(false);
  readonly categoryRail = viewChild<ElementRef<HTMLElement>>('categoryRail');

  readonly usesCollapsibleCategories = computed(() => {
    const template = this.menu()?.style.templateId;
    return template === 'gourmet' || template === 'gourmet-hero';
  });

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const categories = this.menu()?.categories ?? [];

    if (!q) return categories;

    return categories
      .map((cat) => {
        const matchingProducts = cat.products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)),
        );

        return {
          ...cat,
          products: matchingProducts,
        };
      })
      .filter((cat) => cat.products.length > 0);
  });

  scrollToCategory(categoryId: string): void {
    this.activeCategoryId.set(categoryId);
    if (this.usesCollapsibleCategories()) this.expandedCategoryId.set(categoryId);
    requestAnimationFrame(() =>
      document
        .getElementById(`cat-${categoryId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  toggleCategory(categoryId: string): void {
    if (!this.usesCollapsibleCategories()) return;
    this.activeCategoryId.set(categoryId);
    const shouldOpen = this.expandedCategoryId() !== categoryId;
    this.expandedCategoryId.set(shouldOpen ? categoryId : null);
    if (shouldOpen) {
      requestAnimationFrame(() =>
        document
          .getElementById(`cat-${categoryId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }

  isCategoryOpen(categoryId: string): boolean {
    return (
      !this.usesCollapsibleCategories() ||
      this.searchQuery().trim().length > 0 ||
      this.expandedCategoryId() === categoryId
    );
  }

  scrollCategoryRail(direction: -1 | 1): void {
    this.categoryRail()?.nativeElement.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }

  toggleCategoriesMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.categoriesMenuOpen.update((open) => !open);
  }

  selectCategoryFromMenu(categoryId: string): void {
    this.categoriesMenuOpen.set(false);
    this.scrollToCategory(categoryId);
  }

  openProduct(product: PublicProduct): void {
    this.selectedProduct.set(product);
  }

  comboSelectionLabel(group: PublicProductComboGroup): string {
    switch (group.selectionType) {
      case 'SINGLE':
        return 'Selección única';
      case 'MULTIPLE':
        return 'Selección múltiple';
      case 'FIXED':
        return 'Incluido';
    }
  }

  comboGroupInstruction(group: PublicProductComboGroup): string {
    if (group.selectionType === 'FIXED') {
      return 'Incluido automáticamente en tu combo.';
    }

    if (group.selectionType === 'SINGLE') {
      return group.isRequired ? 'Elige 1 opción.' : 'Puedes elegir 1 opción.';
    }

    if (!group.isRequired) {
      return `Puedes elegir hasta ${group.maxSelections} opciones.`;
    }

    if (group.minSelections === group.maxSelections) {
      return `Elige ${group.maxSelections} opciones.`;
    }

    if (group.minSelections > 0) {
      return `Elige entre ${group.minSelections} y ${group.maxSelections} opciones.`;
    }

    return `Elige hasta ${group.maxSelections} opciones.`;
  }

  closeProduct(): void {
    this.selectedProduct.set(null);
  }

  onBackdropKeyup(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeProduct();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.categoriesMenuOpen.set(false);
    this.closeProduct();
  }

  @HostListener('document:click')
  closeCategoriesMenu(): void {
    this.categoriesMenuOpen.set(false);
  }
}
