import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { ApiError } from '../../../shared/http/api-error';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { DigitalMenuService } from './digital-menu.service';
import {
  DigitalMenuConfig,
  DigitalMenuItemSummary,
  DigitalMenuStyle,
  SaveDigitalMenuItemInput,
} from '../models/digital-menu.model';

@Injectable({ providedIn: 'root' })
export class DigitalMenuStore {
  private readonly service = inject(DigitalMenuService);
  private readonly environment = inject(APP_ENVIRONMENT);

  private readonly configState = signal<DigitalMenuConfig | null>(null);
  private readonly categoriesState = signal<DigitalMenuItemSummary[]>([]);
  private readonly productsState = signal<DigitalMenuItemSummary[]>([]);
  private readonly styleState = signal<DigitalMenuStyle>({
    templateId: 'bistro',
    primaryColor: '#10b981',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    selectedButtonTextColor: '#ffffff',
    fontFamily: 'Inter',
    welcomeMessage: '¡Bienvenidos! Descubre nuestra selección de platos.',
    showImages: true,
    headerAlignment: 'left',
    infoPlacement: 'header',
    logoPlacement: 'header',
  });

  private readonly loadingState = signal<boolean>(false);
  private readonly savingState = signal<boolean>(false);
  private readonly savingParametersState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly config = this.configState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly products = this.productsState.asReadonly();
  readonly style = this.styleState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly savingParameters = this.savingParametersState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();

  readonly isEnabled = computed(() => this.configState()?.enabled ?? false);
  readonly slug = computed(() => this.configState()?.slug ?? null);
  readonly canEditSlug = computed(() => this.configState()?.canEditSlug ?? true);

  readonly publicMenuBaseUrl = computed(() =>
    this.environment.menuFrontendUrl.replace(/\/$/, ''),
  );

  readonly publicMenuUrl = computed(() => {
    const s = this.slug();
    if (!s) return null;
    return `${this.publicMenuBaseUrl()}/m/${s}`;
  });

  load(): void {
    this.loadingState.set(true);
    this.errorState.set(null);

    this.service
      .getConfig()
      .pipe(
        tap((cfg) => {
          this.configState.set(cfg);
          this.categoriesState.set([...cfg.categories]);
          this.productsState.set([...cfg.products]);
          if (cfg.style) {
            this.styleState.set({ ...cfg.style });
          }
        }),
        catchError(() => {
          this.errorState.set('Error al cargar la configuración del menú digital.');
          return of(null);
        }),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe();
  }

  // --- Category actions ---
  toggleCategory(targetId: string): void {
    this.categoriesState.update((list) =>
      list.map((item) =>
        item.targetId === targetId ? { ...item, isActive: !item.isActive } : item,
      ),
    );
  }

  moveCategory(targetId: string, direction: 'up' | 'down'): void {
    const list = [...this.categoriesState()];
    const index = list.findIndex((category) => category.targetId === targetId);
    if (index === -1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Recalculate sequential sortOrder
    const reordered = list.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    this.categoriesState.set(reordered);
  }

  moveCategoryBefore(targetId: string, destinationId: string): void {
    if (targetId === destinationId) return;
    const categories = [...this.categoriesState()];
    const sourceIndex = categories.findIndex((category) => category.targetId === targetId);
    const destinationIndex = categories.findIndex((category) => category.targetId === destinationId);
    if (sourceIndex === -1 || destinationIndex === -1) return;
    const [source] = categories.splice(sourceIndex, 1);
    categories.splice(destinationIndex > sourceIndex ? destinationIndex - 1 : destinationIndex, 0, source);
    this.categoriesState.set(categories.map((category, index) => ({ ...category, sortOrder: index + 1 })));
  }

  // --- Product actions ---
  toggleProduct(targetId: string): void {
    this.productsState.update((list) =>
      list.map((item) =>
        item.targetId === targetId ? { ...item, isActive: !item.isActive } : item,
      ),
    );
  }

  moveProduct(targetId: string, direction: 'up' | 'down'): void {
    const list = [...this.productsState()];
    const index = list.findIndex((p) => p.targetId === targetId);
    if (index === -1) return;

    const product = list[index];
    // Find sibling products with the same CategoryId
    const siblings = list.filter((p) => p.categoryId === product.categoryId);
    const sibIdx = siblings.findIndex((p) => p.targetId === targetId);
    const targetSibIdx = direction === 'up' ? sibIdx - 1 : sibIdx + 1;

    if (targetSibIdx < 0 || targetSibIdx >= siblings.length) return;

    const targetSibling = siblings[targetSibIdx];
    const originalTargetIdx = list.findIndex((p) => p.targetId === targetSibling.targetId);

    // Swap in main list
    list[index] = targetSibling;
    list[originalTargetIdx] = product;

    // Re-index sort order within category
    let orderCounter = 1;
    const reordered = list.map((item) => {
      if (item.categoryId === product.categoryId) {
        return { ...item, sortOrder: orderCounter++ };
      }
      return item;
    });

    this.productsState.set(reordered);
  }

  moveProductBefore(targetId: string, destinationId: string): void {
    if (targetId === destinationId) return;
    const products = [...this.productsState()];
    const sourceIndex = products.findIndex((product) => product.targetId === targetId);
    const destinationIndex = products.findIndex((product) => product.targetId === destinationId);
    if (sourceIndex === -1 || destinationIndex === -1) return;
    const source = products[sourceIndex];
    const destination = products[destinationIndex];
    if (source.categoryId !== destination.categoryId) return;

    const siblingIndexes = products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => product.categoryId === source.categoryId)
      .map(({ index }) => index);
    const siblings = siblingIndexes.map((index) => products[index]);
    const sourceSiblingIndex = siblings.findIndex((product) => product.targetId === targetId);
    const destinationSiblingIndex = siblings.findIndex((product) => product.targetId === destinationId);
    const [dragged] = siblings.splice(sourceSiblingIndex, 1);
    siblings.splice(destinationSiblingIndex > sourceSiblingIndex ? destinationSiblingIndex - 1 : destinationSiblingIndex, 0, dragged);
    siblingIndexes.forEach((index, siblingIndex) => {
      products[index] = { ...siblings[siblingIndex], sortOrder: siblingIndex + 1 };
    });
    this.productsState.set(products);
  }

  // --- Save items ---
  saveItems(): void {
    this.savingState.set(true);
    this.errorState.set(null);
    this.successState.set(null);

    const categoryInputs: SaveDigitalMenuItemInput[] = this.categoriesState().map((c) => ({
      itemType: 'CATEGORY',
      targetId: c.targetId,
      categoryId: null,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    }));

    const productInputs: SaveDigitalMenuItemInput[] = this.productsState().map((p) => ({
      itemType: 'PRODUCT',
      targetId: p.targetId,
      categoryId: p.categoryId,
      sortOrder: p.sortOrder,
      isActive: p.isActive,
    }));

    this.service
      .updateItems({ items: [...categoryInputs, ...productInputs] })
      .pipe(
        tap(() => {
          this.successState.set('Cambios en productos y categorías guardados exitosamente.');
          this.load();
          setTimeout(() => this.successState.set(null), 3500);
        }),
        catchError(() => {
          this.errorState.set('No fue posible guardar los cambios de productos y categorías.');
          return of(null);
        }),
        finalize(() => this.savingState.set(false)),
      )
      .subscribe();
  }

  // --- Style actions ---
  updateStyleLocally(partial: Partial<DigitalMenuStyle>): void {
    this.styleState.update((s) => ({ ...s, ...partial }));
  }

  saveStyle(): void {
    this.savingState.set(true);
    this.errorState.set(null);
    this.successState.set(null);

    this.service
      .updateStyle(this.styleState())
      .pipe(
        tap(() => {
          this.successState.set('Estilo del menú digital guardado exitosamente.');
          this.load();
          setTimeout(() => this.successState.set(null), 3500);
        }),
        catchError(() => {
          this.errorState.set('No fue posible guardar la configuración de estilo.');
          return of(null);
        }),
        finalize(() => this.savingState.set(false)),
      )
      .subscribe();
  }

  // --- Parameters actions (Slug & Enable switch) ---
  updateParameters(enabled: boolean, rawSlug: string): void {
    const slug = rawSlug?.trim().toLowerCase() || '';
    this.savingParametersState.set(true);
    this.errorState.set(null);
    this.successState.set(null);

    this.service
      .updateParameters({ enabled, slug: slug || null })
      .pipe(
        tap(() => {
          this.successState.set('Configuración del menú guardada exitosamente.');
          this.load();
          setTimeout(() => this.successState.set(null), 3500);
        }),
        catchError((error: unknown) => {
          const apiError = error instanceof ApiError ? error : null;
          const code = apiError?.code;
          if (code === 'DIGITAL_MENU_SLUG_ALREADY_EXISTS' || apiError?.status === 409) {
            this.errorState.set(
              'Este identificador (slug) ya está en uso por otra organización. Elige uno diferente.',
            );
          } else if (code === 'DIGITAL_MENU_SLUG_IMMUTABLE') {
            this.errorState.set('El identificador del menú digital no se puede modificar.');
          } else if (code === 'DIGITAL_MENU_SLUG_REQUIRED' || (enabled && !slug)) {
            this.errorState.set(
              'Debes asignar un identificador único para poder habilitar el menú digital.',
            );
          } else {
            this.errorState.set('No fue posible guardar los parámetros del menú.');
          }
          return of(null);
        }),
        finalize(() => this.savingParametersState.set(false)),
      )
      .subscribe();
  }
}
