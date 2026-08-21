import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, of } from 'rxjs';
import { SettingsStore } from '../../settings/data-access/settings-store.service';
import { PRODUCT_REPOSITORY } from '../../products/data-access/product.repository';
import { Product, ProductCategory } from '../../products/models/product.model';
import { ORDER_REPOSITORY } from '../../orders/data-access/order.repository';
import {
  CreateOrderItem,
  Order,
  OrderItem,
  PartialItemPay,
  PaymentSplit,
} from '../../orders/models/order.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { TableStore } from '../data-access/table-store.service';
import { RestaurantTable } from '../models/table.model';

export interface ConfiguredProductModalState {
  product: Product;
  quantity: number;
  notes: string;
  activeSubTab: 'notes' | 'modifiers';
}

export interface CustomSaleModalState {
  description: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface CancelItemModalState {
  item: OrderItem;
  reason: string;
}

export interface MoveTableModalState {
  targetTableId: string;
}

export interface SelectedItemToPay {
  item: OrderItem;
  quantityToPay: number;
  unitPrice: number;
  subtotalToPay: number;
}

export interface PartialPaySelectorModalState {
  itemsSelection: { item: OrderItem; selected: boolean; quantityToPay: number }[];
}

export interface CheckoutModalState {
  isPartial: boolean;
  itemsToPay: SelectedItemToPay[];
  subtotalToPay: number;
  tipAmount: number;
  isMixed: boolean;
  splits: { method: string; amount: number; cashReceived?: number }[];
  singleCashReceived?: number;
}

@Component({
  selector: 'app-table-operation-dialog',
  imports: [CurrencyPipe, DatePipe, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './table-operation-dialog.component.html',
  styleUrl: './table-operation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableOperationDialogComponent {
  readonly Math = Math;
  readonly table = input.required<RestaurantTable>();
  readonly blocked = input(false);
  readonly canOperate = input(false);
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly orderUpdated = output<void>();

  private readonly orderRepo = inject(ORDER_REPOSITORY);
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  readonly settingsStore = inject(SettingsStore);
  readonly tableStore = inject(TableStore);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeMainTab = signal<'add' | 'billing'>('add');
  readonly searchQuery = signal<string>('');
  readonly selectedCategoryId = signal<string | null>(null);

  readonly products = signal<readonly Product[]>([]);
  readonly categories = signal<readonly ProductCategory[]>([]);
  readonly loadingCatalog = signal<boolean>(false);
  readonly catalogPage = signal<number>(1);
  readonly catalogTotalPages = signal<number>(1);
  readonly catalogTotalCount = signal<number>(0);

  readonly activeOrder = signal<Order | null>(null);
  readonly loadingOrder = signal<boolean>(false);

  readonly draftItems = signal<readonly CreateOrderItem[]>([]);
  readonly draftObservations = signal<string>('');
  readonly submittingOrder = signal<boolean>(false);

  // Sub-modals
  readonly configuredProduct = signal<ConfiguredProductModalState | null>(null);
  readonly customSaleState = signal<CustomSaleModalState | null>(null);
  readonly cancellingItemState = signal<CancelItemModalState | null>(null);
  readonly movingTableState = signal<MoveTableModalState | null>(null);
  readonly partialPaySelectorState = signal<PartialPaySelectorModalState | null>(null);
  readonly checkoutState = signal<CheckoutModalState | null>(null);

  readonly availableTablesToMove = computed(() => {
    const currentId = this.table().id;
    return this.tableStore
      .operationAreas()
      .flatMap((area) => area.tables)
      .filter((t) => t.id !== currentId && t.status === 'AVAILABLE' && !t.isCashRegister);
  });

  readonly draftTotal = computed(() =>
    this.draftItems().reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
  );

  readonly activeItemsPending = computed(() =>
    this.activeOrder()?.items.filter((i) => i.status === 'PENDING') ?? [],
  );

  readonly activeItemsPaid = computed(() =>
    this.activeOrder()?.items.filter((i) => i.status === 'PAID') ?? [],
  );

  readonly activeItemsCancelled = computed(() =>
    this.activeOrder()?.items.filter((i) => i.status === 'CANCELLED') ?? [],
  );

  constructor() {
    effect(() => {
      const currentTable = this.table();
      if (currentTable.status === 'OCCUPIED') {
        this.loadActiveOrder(currentTable.id);
      } else {
        this.activeOrder.set(null);
        this.activeMainTab.set('add');
      }
    });

    this.loadCategories();
    this.loadCatalog(1);
    this.settingsStore.load().pipe(takeUntilDestroyed(), catchError(() => EMPTY)).subscribe();
  }

  private loadCategories(): void {
    this.productRepo
      .listCategories()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
      )
      .subscribe((cats: readonly ProductCategory[]) => this.categories.set(cats));
  }

  loadCatalog(page = 1): void {
    this.loadingCatalog.set(true);
    const q = this.searchQuery().trim();
    this.productRepo
      .list({
        page,
        pageSize: 100,
        search: q ? q : null,
        categoryId: this.selectedCategoryId(),
        type: null,
        includeInactive: false,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 })),
      )
      .subscribe((res) => {
        this.products.set(res.items);
        this.catalogPage.set(res.page);
        this.catalogTotalPages.set(res.totalPages || 1);
        this.catalogTotalCount.set(res.totalCount);
        this.loadingCatalog.set(false);
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.loadCatalog(1);
  }

  selectCategory(catId: string | null): void {
    this.selectedCategoryId.set(catId);
    this.loadCatalog(1);
  }

  goToCatalogPage(page: number): void {
    if (page >= 1 && page <= this.catalogTotalPages()) {
      this.loadCatalog(page);
    }
  }

  loadActiveOrder(tableId: string): void {
    this.loadingOrder.set(true);
    this.orderRepo
      .getActiveByTable(tableId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((order) => {
        this.activeOrder.set(order);
        this.loadingOrder.set(false);
      });
  }

  // Sub-modal product configuration
  openProductConfig(product: Product): void {
    this.configuredProduct.set({
      product,
      quantity: 1,
      notes: '',
      activeSubTab: 'notes',
    });
  }

  closeProductConfig(): void {
    this.configuredProduct.set(null);
  }

  updateProductConfigQty(delta: number): void {
    const curr = this.configuredProduct();
    if (!curr) return;
    const nextQty = Math.max(1, curr.quantity + delta);
    this.configuredProduct.set({ ...curr, quantity: nextQty });
  }

  confirmAddProductConfig(): void {
    const curr = this.configuredProduct();
    if (!curr) return;
    const item: CreateOrderItem = {
      productId: curr.product.id,
      productName: curr.product.name,
      unitPrice: curr.product.salePrice,
      quantity: curr.quantity,
      notes: curr.notes.trim() || null,
      isCustomSale: false,
    };
    this.draftItems.update((current) => [...current, item]);
    this.closeProductConfig();
    this.toastService.show(`"${curr.product.name}" agregado al borrador`, 'success', 2000);
  }

  // Custom sale sub-modal
  openCustomSaleModal(): void {
    this.customSaleState.set({
      description: '',
      price: 0,
      quantity: 1,
      notes: '',
    });
  }

  closeCustomSaleModal(): void {
    this.customSaleState.set(null);
  }

  confirmCustomSale(): void {
    const curr = this.customSaleState();
    if (!curr || !curr.description.trim() || curr.price <= 0 || curr.quantity <= 0) {
      this.toastService.show('Ingresa una descripción y precio válido para la venta libre', 'warning', 3000);
      return;
    }
    const item: CreateOrderItem = {
      productId: null,
      productName: curr.description.trim(),
      unitPrice: curr.price,
      quantity: curr.quantity,
      notes: curr.notes.trim() || null,
      isCustomSale: true,
    };
    this.draftItems.update((current) => [...current, item]);
    this.closeCustomSaleModal();
    this.toastService.show('Venta libre agregada al borrador', 'success', 2000);
  }

  // Draft operations
  updateDraftQty(index: number, delta: number): void {
    this.draftItems.update((items) => {
      const copy = [...items];
      const target = copy[index];
      if (!target) return items;
      const nextQty = target.quantity + delta;
      if (nextQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = { ...target, quantity: nextQty };
      }
      return copy;
    });
  }

  removeDraftItem(index: number): void {
    this.draftItems.update((items) => items.filter((_, i) => i !== index));
  }

  clearDraft(): void {
    this.draftItems.set([]);
    this.draftObservations.set('');
  }

  confirmSendDraft(): void {
    const items = this.draftItems();
    if (items.length === 0) return;
    this.submittingOrder.set(true);

    this.orderRepo
      .addItems(this.table().id, {
        items,
        observations: this.draftObservations().trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toastService.show('No se pudo registrar la comanda.', 'error', 4000);
          this.submittingOrder.set(false);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.submittingOrder.set(false);
        this.clearDraft();
        this.toastService.show('Pedido ingresado correctamente', 'success', 3000);
        this.orderUpdated.emit();
        this.loadActiveOrder(this.table().id);
        this.activeMainTab.set('billing');
      });
  }

  // Cancel item modal
  openCancelItemModal(item: OrderItem): void {
    this.cancellingItemState.set({ item, reason: '' });
  }

  closeCancelItemModal(): void {
    this.cancellingItemState.set(null);
  }

  confirmCancelItem(): void {
    const state = this.cancellingItemState();
    if (!state || !state.reason.trim()) {
      this.toastService.show('Debes ingresar un motivo de cancelación obligatorio', 'warning', 3000);
      return;
    }
    this.orderRepo
      .cancelItem(state.item.id, { reason: state.reason.trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toastService.show('No se pudo cancelar el producto', 'error', 3000);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.closeCancelItemModal();
        this.toastService.show('Producto cancelado correctamente', 'info', 3000);
        this.orderUpdated.emit();
        this.loadActiveOrder(this.table().id);
      });
  }

  // Move table modal
  openMoveTableModal(): void {
    const available = this.availableTablesToMove();
    if (available.length === 0) {
      this.toastService.show('No hay mesas disponibles para trasladar la orden', 'warning', 3000);
      return;
    }
    this.movingTableState.set({ targetTableId: available[0]?.id ?? '' });
  }

  closeMoveTableModal(): void {
    this.movingTableState.set(null);
  }

  confirmMoveTable(): void {
    const state = this.movingTableState();
    if (!state || !state.targetTableId) return;
    this.orderRepo
      .moveTable(this.table().id, { targetTableId: state.targetTableId })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toastService.show('No se pudo trasladar la mesa', 'error', 3000);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.closeMoveTableModal();
        this.toastService.show('Mesa trasladada exitosamente', 'success', 3000);
        this.orderUpdated.emit();
        this.closed.emit();
      });
  }

  // PARTIAL PAY SELECTOR MODAL
  openPartialPaySelectorModal(): void {
    const pending = this.activeItemsPending();
    if (pending.length === 0) {
      this.toastService.show('No hay productos pendientes por pagar', 'warning', 3000);
      return;
    }
    const selection = pending.map((item) => ({
      item,
      selected: true,
      quantityToPay: item.quantity,
    }));
    this.partialPaySelectorState.set({ itemsSelection: selection });
  }

  closePartialPaySelectorModal(): void {
    this.partialPaySelectorState.set(null);
  }

  togglePartialItemSelection(index: number): void {
    const curr = this.partialPaySelectorState();
    if (!curr) return;
    const copy = [...curr.itemsSelection];
    const target = copy[index];
    if (!target) return;
    copy[index] = { ...target, selected: !target.selected };
    this.partialPaySelectorState.set({ itemsSelection: copy });
  }

  updatePartialItemQty(index: number, delta: number): void {
    const curr = this.partialPaySelectorState();
    if (!curr) return;
    const copy = [...curr.itemsSelection];
    const target = copy[index];
    if (!target) return;
    const nextQty = Math.min(target.item.quantity, Math.max(1, target.quantityToPay + delta));
    copy[index] = { ...target, quantityToPay: nextQty };
    this.partialPaySelectorState.set({ itemsSelection: copy });
  }

  readonly partialSubtotalToPay = computed(() => {
    const state = this.partialPaySelectorState();
    if (!state) return 0;
    return state.itemsSelection
      .filter((s) => s.selected)
      .reduce((sum, s) => sum + s.item.unitPrice * s.quantityToPay, 0);
  });

  confirmPartialSelectionAndProceedToCheckout(): void {
    const state = this.partialPaySelectorState();
    if (!state) return;
    const selected = state.itemsSelection.filter((s) => s.selected && s.quantityToPay > 0);
    if (selected.length === 0) {
      this.toastService.show('Debes seleccionar al menos un producto para pagar', 'warning', 3000);
      return;
    }

    const itemsToPay: SelectedItemToPay[] = selected.map((s) => ({
      item: s.item,
      quantityToPay: s.quantityToPay,
      unitPrice: s.item.unitPrice,
      subtotalToPay: s.item.unitPrice * s.quantityToPay,
    }));

    this.closePartialPaySelectorModal();
    this.launchCheckoutModal(true, itemsToPay);
  }

  // FULL CHECKOUT MODAL LAUNCH
  openFullCheckoutModal(): void {
    const pending = this.activeItemsPending();
    if (pending.length === 0) {
      this.toastService.show('No hay productos activos pendientes por pagar', 'warning', 3000);
      return;
    }
    const itemsToPay: SelectedItemToPay[] = pending.map((item) => ({
      item,
      quantityToPay: item.quantity,
      unitPrice: item.unitPrice,
      subtotalToPay: item.subtotal,
    }));
    this.launchCheckoutModal(false, itemsToPay);
  }

  private launchCheckoutModal(isPartial: boolean, itemsToPay: SelectedItemToPay[]): void {
    const subtotalToPay = itemsToPay.reduce((acc, i) => acc + i.subtotalToPay, 0);
    const business = this.settingsStore.business();
    const showTip = business?.showVoluntaryTip ?? false;
    const tipPct = business?.suggestedTipPercentage ?? 10;
    const tipAmount = showTip ? Math.round(subtotalToPay * (tipPct / 100)) : 0;

    const methods = this.settingsStore.paymentMethods().filter((pm) => pm.isActive);
    const defaultMethod = methods.length > 0 ? methods[0]?.name ?? 'Efectivo' : 'Efectivo';

    this.checkoutState.set({
      isPartial,
      itemsToPay,
      subtotalToPay,
      tipAmount,
      isMixed: false,
      splits: [{ method: defaultMethod, amount: subtotalToPay + tipAmount }],
      singleCashReceived: undefined,
    });
  }

  closeCheckoutModal(): void {
    this.checkoutState.set(null);
  }

  toggleMixedPayment(): void {
    const curr = this.checkoutState();
    if (!curr) return;
    const nextMixed = !curr.isMixed;
    const targetTotal = curr.subtotalToPay + curr.tipAmount;
    const methods = this.settingsStore.paymentMethods().filter((pm) => pm.isActive);
    const defaultMethod = methods.length > 0 ? methods[0]?.name ?? 'Efectivo' : 'Efectivo';

    this.checkoutState.set({
      ...curr,
      isMixed: nextMixed,
      splits: [{ method: defaultMethod, amount: targetTotal }],
    });
  }

  updateTipAmount(val: number | string): void {
    const curr = this.checkoutState();
    if (!curr) return;
    const numericTip = Math.max(0, +val || 0);
    const targetTotal = curr.subtotalToPay + numericTip;

    const copySplits = [...curr.splits];
    if (copySplits.length === 1 && !curr.isMixed) {
      copySplits[0] = { ...copySplits[0]!, amount: targetTotal };
    }

    this.checkoutState.set({
      ...curr,
      tipAmount: numericTip,
      splits: copySplits,
    });
  }

  updateSinglePaymentAmount(val: number | string): void {
    const curr = this.checkoutState();
    if (!curr) return;
    const amt = Math.max(0, +val || 0);
    const copySplits = [...curr.splits];
    if (copySplits[0]) {
      copySplits[0] = { ...copySplits[0], amount: amt };
    }
    this.checkoutState.set({
      ...curr,
      splits: copySplits,
    });
  }

  updateSplitAmount(index: number, val: number | string): void {
    const curr = this.checkoutState();
    if (!curr) return;
    const amt = Math.max(0, +val || 0);
    const copySplits = [...curr.splits];
    if (copySplits[index]) {
      copySplits[index] = { ...copySplits[index], amount: amt };
    }
    this.checkoutState.set({
      ...curr,
      splits: copySplits,
    });
  }

  addPaymentSplit(): void {
    const curr = this.checkoutState();
    if (!curr) return;
    const methods = this.settingsStore.paymentMethods().filter((pm) => pm.isActive);
    const defaultMethod = methods[0]?.name ?? 'Efectivo';

    const currentSplitsTotal = curr.splits.reduce((acc, s) => acc + s.amount, 0);
    const targetTotal = curr.subtotalToPay + curr.tipAmount;
    const remaining = Math.max(0, targetTotal - currentSplitsTotal);

    this.checkoutState.set({
      ...curr,
      splits: [...curr.splits, { method: defaultMethod, amount: remaining }],
    });
  }

  removePaymentSplit(index: number): void {
    const curr = this.checkoutState();
    if (!curr || curr.splits.length <= 1) return;
    this.checkoutState.set({
      ...curr,
      splits: curr.splits.filter((_, i) => i !== index),
    });
  }

  readonly targetTotalToPay = computed(() => {
    const state = this.checkoutState();
    if (!state) return 0;
    return state.subtotalToPay + state.tipAmount;
  });

  readonly splitsTotal = computed(() => {
    const state = this.checkoutState();
    if (!state) return 0;
    return state.splits.reduce((acc, s) => acc + (s.amount || 0), 0);
  });

  readonly balanceDifference = computed(() => {
    return this.targetTotalToPay() - this.splitsTotal();
  });

  confirmCheckout(): void {
    const state = this.checkoutState();
    if (!state) return;

    const targetTotal = this.targetTotalToPay();
    const currentSplitsTotal = this.splitsTotal();

    if (Math.abs(currentSplitsTotal - targetTotal) > 0.01) {
      this.toastService.show(
        `El monto a pagar ingresado (${currentSplitsTotal}) no cubre o excede el total requerido (${targetTotal})`,
        'warning',
        4000,
      );
      return;
    }

    let splitsToSend: PaymentSplit[] | undefined = undefined;
    if (state.isMixed) {
      splitsToSend = state.splits.map((s) => ({ method: s.method, amount: s.amount }));
    }

    const itemsToPayPayload: PartialItemPay[] | undefined = state.itemsToPay.map((i) => ({
      itemId: i.item.id,
      quantity: i.quantityToPay,
    }));

    this.orderRepo
      .checkout(this.table().id, {
        paymentMethod: state.isMixed ? 'Pago Mixto' : state.splits[0]?.method ?? 'Efectivo',
        splits: splitsToSend,
        tipAmount: state.tipAmount,
        itemsToPay: itemsToPayPayload,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.toastService.show('No se pudo procesar el pago y cierre de la mesa', 'error', 3000);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.closeCheckoutModal();
        const msg = state.isPartial
          ? '¡Pago parcial procesado correctamente!'
          : '¡Mesa cobrada y liberada exitosamente!';
        this.toastService.show(msg, 'success', 3000);
        this.orderUpdated.emit();
        this.loadActiveOrder(this.table().id);
      });
  }
}
