import { isDevMode } from '@angular/core';
import {
  AvailableModule,
  NavigationOption,
  NavigationSection,
} from '../../../core/context/authenticated-context.model';

export type ModuleIcon =
  | 'orders'
  | 'tables'
  | 'inventory'
  | 'products'
  | 'categories'
  | 'kitchen'
  | 'reports'
  | 'billing'
  | 'settings'
  | 'module';

export interface ModuleNavigationDefinition {
  readonly code: string;
  readonly path: string;
  readonly icon: ModuleIcon;
}

export interface ModuleNavigationItem extends ModuleNavigationDefinition {
  readonly id: string;
  readonly name: string;
  readonly route: string;
  readonly order: number;
  readonly kind: 'module' | 'option';
  readonly moduleCode: string;
}

export interface SectionNavigationItem {
  readonly code: string;
  readonly name: string;
  readonly order: number;
  readonly isGrouped: boolean;
  readonly items: readonly ModuleNavigationItem[];
}

export const KNOWN_MODULE_NAVIGATION: readonly ModuleNavigationDefinition[] = [
  { code: 'orders', path: 'orders', icon: 'orders' },
  { code: 'tables', path: 'sell/tables', icon: 'tables' },
  { code: 'inventory', path: 'inventory', icon: 'inventory' },
  { code: 'products', path: 'products', icon: 'products' },
  { code: 'categories', path: 'categories', icon: 'categories' },
  { code: 'kitchen', path: 'kitchen', icon: 'kitchen' },
  { code: 'reports', path: 'reports', icon: 'reports' },
  { code: 'billing', path: 'billing', icon: 'billing' },
  { code: 'cash_registers', path: 'cash-registers', icon: 'billing' },
  { code: 'settings', path: 'settings', icon: 'settings' },
] as const;

const definitions = new Map(
  KNOWN_MODULE_NAVIGATION.map((definition) => [definition.code, definition]),
);

const optionDefinitions = new Map<string, ModuleNavigationDefinition>([
  ['tables.manage', { code: 'tables.manage', path: 'configuration/tables/manage', icon: 'tables' }],
  [
    'cash-registers.manage',
    { code: 'cash-registers.manage', path: 'configuration/cash-registers/manage', icon: 'billing' },
  ],
]);

export const MODULE_ICON_GLYPHS: Readonly<Record<ModuleIcon, string>> = {
  orders: '≡',
  tables: '▦',
  inventory: '▤',
  products: '◇',
  categories: '⊞',
  kitchen: '♨',
  reports: '↗',
  billing: '$',
  settings: '⚙',
  module: '◫',
};

const warnedCodes = new Set<string>();

const warnAboutFallback = (code: string): void => {
  if (!isDevMode() || warnedCodes.has(code)) return;
  warnedCodes.add(code);
  console.warn(`[Savia Up] Navigation code "${code}" uses the safe fallback.`);
};

const resolveDefinition = (
  code: string,
  moduleCode: string,
): ModuleNavigationDefinition | undefined =>
  optionDefinitions.get(code) ?? definitions.get(code) ?? definitions.get(moduleCode);

const createNavigationItem = (
  item: AvailableModule | NavigationOption,
  kind: ModuleNavigationItem['kind'],
): ModuleNavigationItem => {
  const moduleCode = kind === 'option' ? (item as NavigationOption).moduleCode : item.code;
  const definition = resolveDefinition(item.code, moduleCode);
  if (!definition) warnAboutFallback(item.code);
  const path = definition?.path ?? `modules/${encodeURIComponent(item.code)}`;

  return {
    id: kind === 'module' ? (item as AvailableModule).id : `option:${item.code}`,
    code: item.code,
    moduleCode,
    name: item.name,
    order: item.order,
    path,
    route: `/app/${path}`,
    icon: definition?.icon ?? 'module',
    kind,
  };
};

const byOrder = <T extends { readonly order: number }>(left: T, right: T): number =>
  left.order - right.order;

export const createSectionNavigation = (
  sections: readonly NavigationSection[],
): readonly SectionNavigationItem[] =>
  [...sections]
    .sort(byOrder)
    .map((section) => ({
      code: section.code,
      name: section.name,
      order: section.order,
      isGrouped: section.isGrouped,
      items: [
        ...section.modules.map((module) => createNavigationItem(module, 'module')),
        ...section.options.map((option) => createNavigationItem(option, 'option')),
      ].sort(byOrder),
    }))
    .filter((section) => section.items.length > 0);
