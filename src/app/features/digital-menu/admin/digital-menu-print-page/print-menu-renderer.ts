import {
  DigitalMenuConfig,
  DigitalMenuItemSummary,
  DigitalMenuStyle,
  DigitalMenuVariation,
} from '../../models/digital-menu.model';

export const PRINT_WIDTH = 1240;
export const PRINT_HEIGHT = 1754;
const CONTENT_TOP = 290;
const CONTENT_BOTTOM = 1630;
const CARD_GAP = 18;
const CATEGORY_HEIGHT = 66;
const CONTENT_LEFT = 90;
const CONTENT_WIDTH = 1060;

export interface PrintLayout {
  readonly columns: 1 | 2 | 3;
  readonly fontScale: number;
}

export const DEFAULT_PRINT_LAYOUT: PrintLayout = { columns: 1, fontScale: 1 };

export interface PrintMenu {
  readonly organizationName: string;
  readonly continuationLabel: string;
  readonly style: DigitalMenuStyle;
  readonly categories: readonly PrintCategory[];
}

export interface PrintCategory {
  readonly id: string;
  readonly name: string;
  readonly products: readonly PrintProduct[];
}

export interface PrintProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number | null;
  readonly imageRef: string | null;
  readonly variations: readonly DigitalMenuVariation[];
}

export type PrintEntry =
  | { readonly kind: 'category'; readonly name: string; readonly y: number }
  | {
      readonly kind: 'product';
      readonly product: PrintProduct;
      readonly variations: readonly DigitalMenuVariation[];
      readonly continued: boolean;
      readonly hasImage: boolean;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };

export interface PrintPage {
  readonly entries: readonly PrintEntry[];
}

export function summarizeDescription(description: string | null | undefined): string {
  const normalized = (description ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 125) return normalized;
  const clipped = normalized.slice(0, 122);
  return `${clipped.slice(0, clipped.lastIndexOf(' ')) || clipped}…`;
}

export function buildPrintMenu(
  config: DigitalMenuConfig,
  organizationName: string,
  continuationLabel: string,
): PrintMenu {
  const order = (a: DigitalMenuItemSummary, b: DigitalMenuItemSummary): number =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es');
  const products = config.products.filter((product) => product.isActive);
  return {
    organizationName,
    continuationLabel,
    style: config.style,
    categories: config.categories
      .filter((category) => category.isActive)
      .sort(order)
      .map((category) => ({
        id: category.targetId,
        name: category.name,
        products: products
          .filter((product) => product.categoryId === category.targetId)
          .sort(order)
          .map((product) => ({
            id: product.targetId,
            name: product.name,
            description: summarizeDescription(product.description),
            price: product.price ?? null,
            imageRef: product.imageRef ?? null,
            variations: [...(product.variations ?? [])].sort(
              (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'),
            ),
          })),
      }))
      .filter((category) => category.products.length > 0),
  };
}

function cardHeight(
  product: PrintProduct,
  variationCount: number,
  hasImage: boolean,
  continued: boolean,
  layout: PrintLayout,
): number {
  const scale = layout.fontScale;
  const hasDescription = Boolean(product.description) && !continued;
  if (layout.columns === 1) {
    const rows = Math.ceil(variationCount / 2);
    return Math.max(
      hasImage ? 263 : 235,
      (hasDescription ? 200 : 150) * scale + rows * 36 * scale + 20,
    );
  }
  const photoHeight = hasImage ? (layout.columns === 2 ? 145 : 110) + 14 : 0;
  const titleHeight = 66 * scale;
  const descriptionHeight = hasDescription ? 56 * scale : 0;
  const detailHeight = variationCount > 0 ? variationCount * 30 * scale : 35 * scale;
  return Math.ceil(36 + photoHeight + titleHeight + descriptionHeight + detailHeight + 16);
}

export function planPrintPages(
  menu: PrintMenu,
  layout: PrintLayout = DEFAULT_PRINT_LAYOUT,
  availableImageIds: ReadonlySet<string> | null = null,
): PrintPage[] {
  if (menu.categories.length === 0) return [];
  const columns = layout.columns;
  const cardWidth = (CONTENT_WIDTH - CARD_GAP * (columns - 1)) / columns;
  const chunkSize = columns === 1 ? 16 : columns === 2 ? 10 : 7;
  const pages: PrintPage[] = [];
  let entries: PrintEntry[] = [];
  let cursor = CONTENT_TOP;

  const finishPage = (): void => {
    if (entries.length > 0) pages.push({ entries });
    entries = [];
    cursor = CONTENT_TOP;
  };

  for (const category of menu.categories) {
    const cards: {
      product: PrintProduct;
      variations: readonly DigitalMenuVariation[];
      continued: boolean;
      hasImage: boolean;
      height: number;
    }[] = [];
    for (const product of category.products) {
      const variationChunks: DigitalMenuVariation[][] = [];
      for (let index = 0; index < product.variations.length; index += chunkSize) {
        variationChunks.push(product.variations.slice(index, index + chunkSize));
      }
      if (variationChunks.length === 0) variationChunks.push([]);
      variationChunks.forEach((variations, chunkIndex) => {
        const continued = chunkIndex > 0;
        const hasImage =
          menu.style.showImages &&
          !continued &&
          (availableImageIds?.has(product.id) ?? Boolean(product.imageRef));
        cards.push({
          product,
          variations,
          continued,
          hasImage,
          height: cardHeight(product, variations.length, hasImage, continued, layout),
        });
      });
    }

    for (let index = 0; index < cards.length; index += columns) {
      const row = cards.slice(index, index + columns);
      const rowHeight = Math.max(...row.map((card) => card.height));
      let headingNeeded = index === 0 || entries.length === 0;
      if (cursor + rowHeight + CARD_GAP + (headingNeeded ? CATEGORY_HEIGHT : 0) > CONTENT_BOTTOM) {
        finishPage();
        headingNeeded = true;
      }
      if (headingNeeded) {
        entries.push({
          kind: 'category',
          name: index === 0 ? category.name : `${category.name} · ${menu.continuationLabel}`,
          y: cursor,
        });
        cursor += CATEGORY_HEIGHT;
      }
      row.forEach((card, column) => {
        entries.push({
          kind: 'product',
          ...card,
          x: CONTENT_LEFT + column * (cardWidth + CARD_GAP),
          y: cursor,
          width: cardWidth,
          height: rowHeight,
        });
      });
      cursor += rowHeight + CARD_GAP;
    }
  }
  finishPage();
  return pages;
}

export function containedImageRect(
  imageWidth: number,
  imageHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(1, boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: boxX + (boxWidth - width) / 2,
    y: boxY + (boxHeight - height) / 2,
    width,
    height,
  };
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const rect = containedImageRect(image.naturalWidth, image.naturalHeight, x, y, width, height);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function hexColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function darkBackground(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 145;
}

function fitText(context: CanvasRenderingContext2D, value: string, width: number): string {
  if (context.measureText(value).width <= width) return value;
  let text = value;
  while (text && context.measureText(`${text}…`).width > width) text = text.slice(0, -1);
  return `${text}…`;
}

function descriptionLines(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      lines.push(fitText(context, line, width));
      if (lines.length === 2) {
        lines[1] = fitText(context, `${lines[1]}…`, width);
        return lines;
      }
      line = word;
    } else {
      line = next;
    }
  }
  if (line && lines.length < 2) lines.push(fitText(context, line, width));
  return lines;
}

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function renderPrintPage(
  menu: PrintMenu,
  page: PrintPage,
  pageNumber: number,
  pageCount: number,
  images: ReadonlyMap<string, HTMLImageElement>,
  logo: HTMLImageElement | null,
  layout: PrintLayout = DEFAULT_PRINT_LAYOUT,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH;
  canvas.height = PRINT_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el lienzo del menú.');

  const style = menu.style;
  const background = hexColor(style.backgroundColor, '#ffffff');
  const primary = hexColor(style.primaryColor, '#0f766e');
  const accent = hexColor(style.accentColor, '#d97706');
  const text = hexColor(style.textColor, '#0f172a');
  const dark = darkBackground(background);
  const fontFamily = ['Inter', 'Outfit', 'Playfair Display', 'Poppins'].includes(style.fontFamily)
    ? `"${style.fontFamily}", Arial, sans-serif`
    : 'Arial, sans-serif';
  context.fillStyle = background;
  context.fillRect(0, 0, PRINT_WIDTH, PRINT_HEIGHT);
  const hero = style.templateId === 'gourmet-hero';
  if (hero) {
    context.fillStyle = primary;
    context.fillRect(0, 0, PRINT_WIDTH, 235);
  }
  context.fillStyle = primary;
  context.fillRect(0, 0, PRINT_WIDTH, hero ? 24 : 15);

  const headerAlign = style.headerAlignment;
  const headerX = headerAlign === 'center' ? PRINT_WIDTH / 2 : headerAlign === 'right' ? 1150 : 90;
  context.textAlign = headerAlign;
  context.fillStyle = hero ? '#ffffff' : text;
  context.font = `700 54px ${fontFamily}`;
  context.fillText(fitText(context, menu.organizationName, logo ? 850 : 1060), headerX, 123);
  if (style.welcomeMessage && style.infoPlacement === 'header') {
    context.font = `26px ${fontFamily}`;
    context.globalAlpha = 0.72;
    context.fillText(fitText(context, style.welcomeMessage, 1020), headerX, 173);
    context.globalAlpha = 1;
  }
  if (logo && (style.logoPlacement === 'header' || style.logoPlacement === 'both')) {
    drawContainedImage(context, logo, headerAlign === 'right' ? 80 : 1060, 55, 95, 95);
  }
  context.fillStyle = accent;
  context.fillRect(90, 218, PRINT_WIDTH - 180, 5);

  for (const entry of page.entries) {
    if (entry.kind === 'category') {
      context.textAlign = 'left';
      context.fillStyle = primary;
      context.font = `700 35px ${fontFamily}`;
      context.fillText(fitText(context, entry.name, 1050), 90, entry.y + 42);
      continue;
    }

    const { product, variations, continued, x, y, width, height } = entry;
    context.fillStyle = dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.88)';
    context.beginPath();
    context.roundRect(x, y, width, height, 22);
    context.fill();
    context.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.12)';
    context.lineWidth = 2;
    context.stroke();

    const image = entry.hasImage ? images.get(product.id) : undefined;
    const showcase = style.templateId === 'showcase';
    const scale = layout.fontScale;
    const title = continued ? `${product.name} · ${menu.continuationLabel}` : product.name;
    if (layout.columns === 1) {
      if (image) {
        const photoX = showcase ? x + width - 253 : x + 23;
        context.fillStyle = dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
        context.beginPath();
        context.roundRect(photoX, y + 24, 230, 215, 14);
        context.fill();
        drawContainedImage(context, image, photoX + 8, y + 32, 214, 199);
      }
      const bodyX = image && !showcase ? x + 285 : x + 35;
      const bodyWidth = image && showcase ? width - 320 : x + width - 35 - bodyX;
      context.textAlign = 'left';
      context.fillStyle = text;
      context.font = `700 ${34 * scale}px ${fontFamily}`;
      context.fillText(fitText(context, title, bodyWidth - 5), bodyX, y + 62 * scale);
      if (!continued && product.description) {
        context.font = `${25 * scale}px ${fontFamily}`;
        context.globalAlpha = 0.78;
        descriptionLines(context, product.description, bodyWidth - 10).forEach((line, index) => {
          context.fillText(line, bodyX, y + (102 + index * 32) * scale);
        });
        context.globalAlpha = 1;
      }
      if (variations.length > 0) {
        const columnWidth = (bodyWidth - 25) / 2;
        context.font = `${25 * scale}px ${fontFamily}`;
        variations.forEach((variation, index) => {
          const column = index % 2;
          const row = Math.floor(index / 2);
          const columnX = bodyX + column * (columnWidth + 25);
          const rowY = y + ((product.description && !continued ? 190 : 150) + row * 36) * scale;
          context.fillStyle = text;
          context.textAlign = 'left';
          context.fillText(fitText(context, variation.name, columnWidth - 130), columnX, rowY);
          context.fillStyle = accent;
          context.textAlign = 'right';
          context.fillText(currency.format(variation.salePrice), columnX + columnWidth, rowY);
        });
      } else if (product.price !== null) {
        context.fillStyle = accent;
        context.font = `700 ${32 * scale}px ${fontFamily}`;
        context.textAlign = 'left';
        context.fillText(
          currency.format(product.price),
          bodyX,
          y + (product.description ? 202 : 150) * scale,
        );
      }
      continue;
    }

    const innerX = x + 18;
    const innerWidth = width - 36;
    const photoHeight = image ? (layout.columns === 2 ? 145 : 110) + 14 : 0;
    if (image) {
      const boxHeight = photoHeight - 14;
      const boxWidth = Math.min(innerWidth, layout.columns === 2 ? 210 : 160);
      const boxX = x + (width - boxWidth) / 2;
      context.fillStyle = dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
      context.beginPath();
      context.roundRect(boxX, y + 18, boxWidth, boxHeight, 12);
      context.fill();
      drawContainedImage(context, image, boxX + 6, y + 24, boxWidth - 12, boxHeight - 12);
    }
    const titleTop = y + 18 + photoHeight;
    context.textAlign = 'left';
    context.fillStyle = text;
    context.font = `700 ${layout.columns === 2 ? 26 * scale : 23 * scale}px ${fontFamily}`;
    descriptionLines(context, title, innerWidth).forEach((line, index) => {
      context.fillText(line, innerX, titleTop + (27 + index * 28) * scale);
    });
    if (!continued && product.description) {
      context.font = `${layout.columns === 2 ? 20 * scale : 18 * scale}px ${fontFamily}`;
      context.globalAlpha = 0.78;
      descriptionLines(context, product.description, innerWidth).forEach((line, index) => {
        context.fillText(line, innerX, titleTop + (82 + index * 25) * scale);
      });
      context.globalAlpha = 1;
    }
    const detailTop = titleTop + (66 + (product.description && !continued ? 56 : 0)) * scale;
    if (variations.length > 0) {
      context.font = `${layout.columns === 2 ? 19 * scale : 17 * scale}px ${fontFamily}`;
      variations.forEach((variation, index) => {
        const rowY = detailTop + (index + 1) * 30 * scale;
        const price = currency.format(variation.salePrice);
        const priceWidth = context.measureText(price).width;
        context.fillStyle = text;
        context.textAlign = 'left';
        context.fillText(
          fitText(context, variation.name, Math.max(30, innerWidth - priceWidth - 12)),
          innerX,
          rowY,
        );
        context.fillStyle = accent;
        context.textAlign = 'right';
        context.fillText(price, innerX + innerWidth, rowY);
      });
    } else if (product.price !== null) {
      context.fillStyle = accent;
      context.font = `700 ${24 * scale}px ${fontFamily}`;
      context.textAlign = 'left';
      context.fillText(currency.format(product.price), innerX, detailTop + 32 * scale);
    }
  }

  context.fillStyle = text;
  context.globalAlpha = 0.65;
  context.font = `22px ${fontFamily}`;
  context.textAlign = 'left';
  context.fillText(
    style.infoPlacement === 'footer' && style.welcomeMessage
      ? fitText(context, style.welcomeMessage, 860)
      : menu.organizationName,
    90,
    1684,
  );
  if (logo && (style.logoPlacement === 'footer' || style.logoPlacement === 'both')) {
    drawContainedImage(context, logo, 90, 1695, 40, 40);
  }
  context.textAlign = 'right';
  context.fillText(`${pageNumber} / ${pageCount}`, 1150, 1684);
  context.globalAlpha = 1;
  return canvas;
}
