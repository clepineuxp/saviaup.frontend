import type { PrintMenu } from './print-menu-renderer';

export function visiblePrintCategoryIds(menu: PrintMenu): readonly string[] {
  return menu.categories.map((category) => category.id);
}

export async function loadOptionalProductPhoto(
  source: string | null | undefined,
  load: (source: string) => Promise<HTMLImageElement>,
): Promise<HTMLImageElement | null> {
  if (!source?.trim()) return null;
  try {
    return await load(source);
  } catch {
    return null;
  }
}
