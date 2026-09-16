import { describe, expect, it } from 'vitest';
import { INVENTORY_ROUTES } from './inventory.routes';

describe('inventory routes integration', () => {
  it('registers the four lazy and independently guarded sections', () => {
    const children = INVENTORY_ROUTES[0].children ?? [];
    const sectionPaths = ['stock', 'ingredients', 'movements', 'complements/units'];

    for (const path of sectionPaths) {
      const route = children.find((candidate) => candidate.path === path);
      expect(route, `missing inventory section ${path}`).toBeDefined();
      expect(route?.loadComponent).toBeTypeOf('function');
      expect(route?.canActivate).toHaveLength(1);
    }
  });

  it('provides the store and all four HTTP repository implementations at feature scope', () => {
    expect(INVENTORY_ROUTES[0].providers).toHaveLength(9);
  });
});
