export type InventoryPermission =
  | 'inventory.stock.read'
  | 'inventory.ingredients.read'
  | 'inventory.ingredients.manage'
  | 'inventory.movements.read'
  | 'inventory.movements.manage'
  | 'inventory.complements.read'
  | 'inventory.complements.manage'
  | 'categories.read';

export interface InventorySectionDefinition {
  readonly code: 'stock' | 'ingredients' | 'movements' | 'complements';
  readonly label: string;
  readonly route: string;
  readonly readPermission: InventoryPermission;
}

export const INVENTORY_SECTIONS: readonly InventorySectionDefinition[] = [
  {
    code: 'stock',
    label: 'inventory.section.stock',
    route: '/app/inventory/stock',
    readPermission: 'inventory.stock.read',
  },
  {
    code: 'ingredients',
    label: 'inventory.section.ingredients',
    route: '/app/inventory/ingredients',
    readPermission: 'inventory.ingredients.read',
  },
  {
    code: 'movements',
    label: 'inventory.section.movements',
    route: '/app/inventory/movements',
    readPermission: 'inventory.movements.read',
  },
  {
    code: 'complements',
    label: 'inventory.section.complements',
    route: '/app/inventory/complements/units',
    readPermission: 'inventory.complements.read',
  },
] as const;
