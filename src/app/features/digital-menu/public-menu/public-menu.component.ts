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
import { PublicProduct } from '../models/digital-menu.model';

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
      document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  toggleCategory(categoryId: string): void {
    if (!this.usesCollapsibleCategories()) return;
    this.activeCategoryId.set(categoryId);
    const shouldOpen = this.expandedCategoryId() !== categoryId;
    this.expandedCategoryId.set(shouldOpen ? categoryId : null);
    if (shouldOpen) {
      requestAnimationFrame(() =>
        document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }

  isCategoryOpen(categoryId: string): boolean {
    return !this.usesCollapsibleCategories()
      || this.searchQuery().trim().length > 0
      || this.expandedCategoryId() === categoryId;
  }

  scrollCategoryRail(direction: -1 | 1): void {
    this.categoryRail()?.nativeElement.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }

  openProduct(product: PublicProduct): void {
    this.selectedProduct.set(product);
  }

  closeProduct(): void {
    this.selectedProduct.set(null);
  }

  onBackdropKeyup(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeProduct();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeProduct();
  }
}
