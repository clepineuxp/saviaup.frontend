import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { ProductStore } from '../data-access/product-store.service';
import { Product, ProductPage } from '../models/product.model';
import { ProductPageComponent } from './product-page.component';

const product: Product = {
  id: 'product-1',
  type: 'NORMAL',
  name: 'Limonada',
  description: null,
  image: null,
  category: { id: 'category-1', name: 'Bebidas', isInventoryTracked: true },
  salePrice: null,
  preparationTimeMinutes: null,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-09-24T00:00:00Z',
  updatedAt: '2026-09-24T00:00:00Z',
  variations: [{ id: 'variation-1', name: 'Grande', salePrice: 12000, order: 1, isActive: true }],
  recipe: [
    {
      id: 'recipe-1',
      ingredientId: 'ingredient-1',
      ingredientName: 'Limón',
      measurementUnitName: 'Unidades',
      measurementUnitCode: 'und',
      customIngredientName: null,
      quantity: 2,
      notes: null,
      order: 1,
      isLinked: true,
    },
  ],
};

describe('ProductPageComponent', () => {
  let fixture: ComponentFixture<ProductPageComponent>;
  const page = signal<ProductPage>({
    items: [product],
    page: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductPageComponent],
      providers: [
        {
          provide: ProductStore,
          useValue: {
            page: page.asReadonly(),
            categories: signal([]).asReadonly(),
            ingredients: signal([]).asReadonly(),
            comboCandidates: signal([]).asReadonly(),
            status: signal('success').asReadonly(),
            lookupStatus: signal('success').asReadonly(),
            mutating: signal(false).asReadonly(),
            error: signal(null).asReadonly(),
            operationError: signal(null).asReadonly(),
            hasPermission: vi.fn(() => true),
            load: vi.fn(() => of(page())),
            loadCategories: vi.fn(() => of([])),
            loadIngredients: vi.fn(() => of([])),
            clearOperationError: vi.fn(),
          },
        },
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductPageComponent);
  });

  it('renders centered tags immediately before the actions column', () => {
    fixture.detectChanges();

    const tags = Array.from(
      fixture.nativeElement.querySelectorAll('.product-tags .pill') as NodeListOf<HTMLElement>,
    ).map((element) => element.textContent?.trim());

    expect(tags).toEqual([
      'products.type.normal',
      'products.tag.variations',
      'products.tag.recipe',
    ]);

    const headers = fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>;
    expect(headers.item(headers.length - 2).textContent?.trim()).toBe('products.column.tags');
    expect(headers.item(headers.length - 2).classList.contains('tags-column')).toBe(true);

    const cells = fixture.nativeElement.querySelectorAll(
      'tbody tr:first-child td',
    ) as NodeListOf<HTMLElement>;
    expect(cells.item(cells.length - 2).classList.contains('tags-column')).toBe(true);
    expect(cells.item(cells.length - 1).classList.contains('actions')).toBe(true);
  });
});
