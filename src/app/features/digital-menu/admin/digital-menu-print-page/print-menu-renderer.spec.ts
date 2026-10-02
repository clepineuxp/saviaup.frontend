import { describe, expect, it, vi } from 'vitest';
import { DigitalMenuConfig } from '../../models/digital-menu.model';
import { loadOptionalProductPhoto, visiblePrintCategoryIds } from './print-menu-images';
import {
  buildPrintMenu,
  containedImageRect,
  planPrintPages,
  summarizeDescription,
} from './print-menu-renderer';

const config: DigitalMenuConfig = {
  enabled: false,
  slug: null,
  canEditSlug: true,
  style: {
    templateId: 'bistro',
    primaryColor: '#0f766e',
    accentColor: '#d97706',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    selectedButtonTextColor: '#ffffff',
    fontFamily: 'Inter',
    welcomeMessage: 'Bienvenidos',
    showImages: true,
    headerAlignment: 'left',
    infoPlacement: 'header',
    logoPlacement: 'header',
  },
  categories: [
    { itemType: 'CATEGORY', targetId: 'visible', name: 'Bebidas', sortOrder: 2, isActive: true },
    { itemType: 'CATEGORY', targetId: 'hidden', name: 'Oculta', sortOrder: 1, isActive: false },
  ],
  products: [
    {
      itemType: 'PRODUCT',
      targetId: 'hidden-product',
      categoryId: 'hidden',
      name: 'No mostrar',
      sortOrder: 1,
      isActive: true,
    },
    {
      itemType: 'PRODUCT',
      targetId: 'first',
      categoryId: 'visible',
      name: 'Limonada',
      description: 'Una limonada con hierbabuena y hielo.',
      price: null,
      sortOrder: 2,
      isActive: true,
      variations: [
        { id: 'large', name: 'Jarra', salePrice: 18000, sortOrder: 2 },
        { id: 'small', name: 'Vaso', salePrice: 7000, sortOrder: 1 },
      ],
    },
    {
      itemType: 'PRODUCT',
      targetId: 'second',
      categoryId: 'visible',
      name: 'Café',
      price: 5000,
      sortOrder: 1,
      isActive: true,
    },
    {
      itemType: 'PRODUCT',
      targetId: 'inactive',
      categoryId: 'visible',
      name: 'Agotado',
      sortOrder: 3,
      isActive: false,
    },
  ],
};

describe('print menu planning', () => {
  it('uses saved visibility and order, including variation prices when the menu is disabled', () => {
    const menu = buildPrintMenu(config, 'Restaurante', 'continuación');
    expect(menu.categories.map((category) => category.name)).toEqual(['Bebidas']);
    expect(menu.categories[0].products.map((product) => product.name)).toEqual([
      'Café',
      'Limonada',
    ]);
    expect(
      menu.categories[0].products[1].variations.map((variation) => variation.salePrice),
    ).toEqual([7000, 18000]);
    const pages = planPrintPages(menu);
    expect(pages).toHaveLength(1);
    expect(
      pages[0].entries
        .filter((entry) => entry.kind === 'product')
        .map((entry) => entry.product.name),
    ).toEqual(['Café', 'Limonada']);
    expect(
      pages[0].entries.some((entry) => entry.kind === 'category' && entry.name === 'Oculta'),
    ).toBe(false);
  });

  it('splits many variations into printable cards without losing any price', () => {
    const longConfig: DigitalMenuConfig = {
      ...config,
      products: [
        {
          ...config.products[1],
          variations: Array.from({ length: 41 }, (_, index) => ({
            id: String(index),
            name: `Tamaño ${index}`,
            salePrice: index + 1,
            sortOrder: index,
          })),
        },
      ],
    };
    for (const columns of [1, 2, 3] as const) {
      const pages = planPrintPages(buildPrintMenu(longConfig, 'Restaurante', 'continuación'), {
        columns,
        fontScale: 1,
      });
      const variationCount = pages
        .flatMap((page) => page.entries)
        .filter((entry) => entry.kind === 'product')
        .reduce((total, entry) => total + entry.variations.length, 0);
      expect(variationCount).toBe(41);
      expect(pages.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the entire image inside its field without enlarging it', () => {
    expect(containedImageRect(800, 400, 0, 0, 200, 200)).toEqual({
      x: 0,
      y: 50,
      width: 200,
      height: 100,
    });
    expect(containedImageRect(80, 40, 0, 0, 200, 200)).toEqual({
      x: 60,
      y: 80,
      width: 80,
      height: 40,
    });
  });

  it('shortens long descriptions at a word boundary', () => {
    const summary = summarizeDescription('Sabores frescos y naturales '.repeat(10));
    expect(summary.length).toBeLessThanOrEqual(125);
    expect(summary.endsWith('…')).toBe(true);
  });

  it('requests image batches only for visible categories, even without image references', () => {
    const photoConfig: DigitalMenuConfig = {
      ...config,
      products: config.products.map((product) => ({
        ...product,
        imageRef: ['first', 'second'].includes(product.targetId) ? null : 'photo.jpg',
      })),
    };
    expect(
      visiblePrintCategoryIds(buildPrintMenu(photoConfig, 'Restaurante', 'continuación')),
    ).toEqual(['visible']);
  });

  it('recalculates the page count for columns, font size and photos found without imageRef', () => {
    const manyConfig: DigitalMenuConfig = {
      ...config,
      products: Array.from({ length: 60 }, (_, index) => ({
        itemType: 'PRODUCT' as const,
        targetId: `product-${index}`,
        categoryId: 'visible',
        name: `Producto ${index}`,
        price: 10000,
        sortOrder: index,
        isActive: true,
      })),
    };
    const menu = buildPrintMenu(manyConfig, 'Restaurante', 'continuación');
    const oneColumn = planPrintPages(menu, { columns: 1, fontScale: 1 });
    const twoColumns = planPrintPages(menu, { columns: 2, fontScale: 1 });
    const threeColumns = planPrintPages(menu, { columns: 3, fontScale: 1 });
    expect(oneColumn.length).toBeGreaterThan(twoColumns.length);
    expect(twoColumns.length).toBeGreaterThan(threeColumns.length);
    expect(planPrintPages(menu, { columns: 2, fontScale: 0.75 }).length).toBeLessThan(
      planPrintPages(menu, { columns: 2, fontScale: 1.25 }).length,
    );
    const withPhoto = planPrintPages(menu, { columns: 3, fontScale: 1 }, new Set(['product-0']));
    const firstProduct = withPhoto[0].entries.find((entry) => entry.kind === 'product');
    expect(firstProduct?.kind === 'product' && firstProduct.hasImage).toBe(true);
    for (const page of threeColumns) {
      for (const entry of page.entries) {
        if (entry.kind === 'product') {
          expect(entry.x).toBeGreaterThanOrEqual(90);
          expect(entry.x + entry.width).toBeLessThanOrEqual(1150);
          expect(entry.y + entry.height).toBeLessThanOrEqual(1630);
        }
      }
    }
  });

  it('omits missing or unreadable optional photos without stopping generation', async () => {
    const image = document.createElement('img');
    const load = vi
      .fn<(source: string) => Promise<HTMLImageElement>>()
      .mockRejectedValueOnce(new Error('Missing image'))
      .mockResolvedValueOnce(image);

    expect(await loadOptionalProductPhoto(null, load)).toBeNull();
    expect(await loadOptionalProductPhoto('broken.jpg', load)).toBeNull();
    expect(await loadOptionalProductPhoto('valid.jpg', load)).toBe(image);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
