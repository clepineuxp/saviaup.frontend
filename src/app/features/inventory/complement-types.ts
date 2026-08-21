export interface InventoryComplementType {
  readonly code: 'units';
  readonly label: string;
  readonly route: string;
}

// New complement catalogs can be registered here without changing the section shell.
export const INVENTORY_COMPLEMENT_TYPES: readonly InventoryComplementType[] = [
  {
    code: 'units',
    label: 'inventory.complements.units.label',
    route: '/app/inventory/complements/units',
  },
] as const;
