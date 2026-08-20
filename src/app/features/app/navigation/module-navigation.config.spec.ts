import { describe, expect, it, vi } from 'vitest';
import { NavigationSection } from '../../../core/context/authenticated-context.model';
import { createSectionNavigation } from './module-navigation.config';

const sections: readonly NavigationSection[] = [
  {
    code: 'operation',
    name: 'Operación del backend',
    order: 2,
    isGrouped: true,
    modules: [
      { id: 'reports', code: 'reports', name: 'Informes del backend', order: 2 },
      { id: 'orders', code: 'orders', name: 'Pedidos del backend', order: 1 },
    ],
    options: [],
  },
  {
    code: 'sales',
    name: 'Ventas del backend',
    order: 1,
    isGrouped: false,
    modules: [{ id: 'tables', code: 'tables', name: 'Mesas del backend', order: 1 }],
    options: [],
  },
];

describe('module navigation configuration', () => {
  it('keeps backend names and orders direct and grouped sections by order', () => {
    const navigation = createSectionNavigation(sections);

    expect(navigation.map((section) => section.code)).toEqual(['sales', 'operation']);
    expect(navigation[0]).toMatchObject({
      name: 'Ventas del backend',
      isGrouped: false,
    });
    expect(navigation[1]).toMatchObject({
      name: 'Operación del backend',
      isGrouped: true,
    });
    expect(navigation[1].items.map((item) => item.code)).toEqual(['orders', 'reports']);
    expect(navigation[1].items.map((item) => item.name)).toEqual([
      'Pedidos del backend',
      'Informes del backend',
    ]);
  });

  it('maps categories to its configured route and icon', () => {
    const [section] = createSectionNavigation([
      {
        code: 'inventory',
        name: 'Inventario',
        order: 1,
        isGrouped: false,
        modules: [{ id: 'categories', code: 'categories', name: 'Categorías', order: 1 }],
        options: [],
      },
    ]);

    expect(section.items[0]).toMatchObject({
      code: 'categories',
      route: '/app/inventory/categories',
      icon: 'categories',
    });
  });

  it('renders future options and resolves their route and icon through moduleCode', () => {
    const [section] = createSectionNavigation([
      {
        code: 'inventory',
        name: 'Inventario',
        order: 1,
        isGrouped: true,
        modules: [{ id: 'categories', code: 'categories', name: 'Categorías', order: 1 }],
        options: [
          {
            code: 'products.manage',
            moduleCode: 'products',
            name: 'Administrar productos',
            order: 2,
          },
        ],
      },
    ]);

    expect(section.items.map((item) => item.code)).toEqual(['categories', 'products.manage']);
    expect(section.items[1]).toMatchObject({
      kind: 'option',
      moduleCode: 'products',
      name: 'Administrar productos',
      route: '/app/products',
      icon: 'products',
    });
  });

  it('uses a safe fallback and emits a development warning for unknown codes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [section] = createSectionNavigation([
      {
        code: 'future',
        name: 'Futuro',
        order: 1,
        isGrouped: false,
        modules: [{ id: 'loyalty', code: 'loyalty', name: 'Fidelización', order: 1 }],
        options: [],
      },
    ]);

    expect(section.items[0]).toMatchObject({
      route: '/app/modules/loyalty',
      icon: 'module',
    });
    expect(warn).toHaveBeenCalledWith(
      '[Savia Up] Navigation code "loyalty" uses the safe fallback.',
    );
    warn.mockRestore();
  });
});
