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
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-digital-menu-products-page',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './digital-menu-products-page.component.html',
  styleUrl: './digital-menu-products-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuProductsPageComponent {
  readonly store = inject(DigitalMenuStore);

  readonly searchQuery = signal<string>('');
  readonly expandedCategoryId = signal<string | null>(null);
  readonly draggedCategoryId = signal<string | null>(null);
  readonly draggedProductId = signal<string | null>(null);

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const categories = this.store.categories();
    const products = this.store.products();

    if (!q) return categories;

    // Filter categories whose name matches OR has products matching search
    return categories.filter((cat) => {
      if (cat.name.toLowerCase().includes(q)) return true;
      const catProducts = products.filter((p) => p.categoryId === cat.targetId);
      return catProducts.some((p) => p.name.toLowerCase().includes(q));
    });
  });

  isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategoryId() === categoryId;
  }

  toggleCategoryExpanded(categoryId: string): void {
    this.expandedCategoryId.update((current) => (current === categoryId ? null : categoryId));
  }

  getProductsForCategory(categoryId: string) {
    const q = this.searchQuery().trim().toLowerCase();
    const prods = this.store.products().filter((p) => p.categoryId === categoryId);
    if (!q) return prods;
    return prods.filter((p) => p.name.toLowerCase().includes(q));
  }

  toggleCategory(targetId: string, event: Event): void {
    event.stopPropagation();
    this.store.toggleCategory(targetId);
  }

  moveCategory(targetId: string, direction: 'up' | 'down', event: Event): void {
    event.stopPropagation();
    this.store.moveCategory(targetId, direction);
  }

  canMoveCategory(targetId: string, direction: 'up' | 'down'): boolean {
    const index = this.store.categories().findIndex((category) => category.targetId === targetId);
    return direction === 'up' ? index > 0 : index >= 0 && index < this.store.categories().length - 1;
  }

  toggleProduct(targetId: string): void {
    this.store.toggleProduct(targetId);
  }

  moveProduct(targetId: string, direction: 'up' | 'down'): void {
    this.store.moveProduct(targetId, direction);
  }

  startCategoryDrag(categoryId: string, event: DragEvent): void {
    this.draggedCategoryId.set(categoryId);
    event.dataTransfer?.setData('text/plain', categoryId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  dropCategory(destinationId: string, event: DragEvent): void {
    event.preventDefault();
    const sourceId = this.draggedCategoryId();
    if (sourceId) this.store.moveCategoryBefore(sourceId, destinationId);
    this.draggedCategoryId.set(null);
  }

  startProductDrag(productId: string, event: DragEvent): void {
    event.stopPropagation();
    this.draggedProductId.set(productId);
    event.dataTransfer?.setData('text/plain', productId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  dropProduct(destinationId: string, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = this.draggedProductId();
    if (sourceId) this.store.moveProductBefore(sourceId, destinationId);
    this.draggedProductId.set(null);
  }

  save(): void {
    this.store.saveItems();
  }
}
