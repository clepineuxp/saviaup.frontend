import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ORDER_REPOSITORY } from '../data-access/order.repository';
import { Order, OrderItem, OrderQueryRequest } from '../models/order.model';
import { OrderDetailsDialogComponent } from '../order-details-dialog/order-details-dialog.component';

export interface ColumnDefinition {
  readonly id: string;
  readonly label: string;
  visible: boolean;
}

export interface FlatOrderItemRow {
  readonly orderId: string;
  readonly orderNumber: number;
  readonly tableName: string | null;
  readonly itemId: string;
  readonly productName: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly subtotal: number;
  readonly status: 'PENDING' | 'PAID' | 'CANCELLED';
  readonly notes: string | null;
  readonly isCustomSale: boolean;
  readonly cancellationReason: string | null;
  readonly cancelledByUserName: string | null;
  readonly createdByUserName: string;
  readonly createdAt: string;
  readonly order: Order;
}

@Component({
  selector: 'app-order-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, OrderDetailsDialogComponent],
  templateUrl: './order-list-page.component.html',
  styleUrl: './order-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListPageComponent implements OnInit {
  private readonly orderRepo = inject(ORDER_REPOSITORY);

  // Active View Tab: 'orders' (por comanda) | 'items' (detalle por producto)
  readonly activeTab = signal<'orders' | 'items'>('orders');

  readonly orders = signal<readonly Order[]>([]);
  readonly loading = signal<boolean>(false);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(25);

  // Filters state
  readonly searchQuery = signal<string>('');
  readonly selectedStatuses = signal<string[]>([]);
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');

  // Selected Order for Modal
  readonly selectedOrder = signal<Order | null>(null);

  // Column visibility selector state for Orders Tab
  readonly showColumnPicker = signal<boolean>(false);
  readonly orderColumns = signal<ColumnDefinition[]>([
    { id: 'orderNumber', label: '# Comanda', visible: true },
    { id: 'tableName', label: 'Mesa', visible: true },
    { id: 'status', label: 'Estado', visible: true },
    { id: 'itemCount', label: 'Ítems', visible: true },
    { id: 'totalAmount', label: 'Total', visible: true },
    { id: 'createdBy', label: 'Creado Por', visible: true },
    { id: 'createdAt', label: 'Fecha Creación', visible: true },
    { id: 'paidBy', label: 'Pagado / Cierre', visible: true },
    { id: 'paidAt', label: 'Fecha Pago', visible: true },
    { id: 'actions', label: 'Acciones', visible: true },
  ]);

  // Column visibility selector state for Items Tab
  readonly itemColumns = signal<ColumnDefinition[]>([
    { id: 'orderNumber', label: '# Comanda', visible: true },
    { id: 'tableName', label: 'Mesa', visible: true },
    { id: 'productName', label: 'Producto / Descripción', visible: true },
    { id: 'quantity', label: 'Cantidad', visible: true },
    { id: 'unitPrice', label: 'Precio Unit.', visible: true },
    { id: 'subtotal', label: 'Subtotal Ítem', visible: true },
    { id: 'status', label: 'Estado Ítem', visible: true },
    { id: 'createdBy', label: 'Creado Por', visible: true },
    { id: 'createdAt', label: 'Fecha Creación', visible: true },
    { id: 'actions', label: 'Ver Orden', visible: true },
  ]);

  // Computed total sum of visible orders (Sum of totalAmount)
  readonly ordersTotalSum = computed(() =>
    this.orders().reduce((sum, order) => sum + (order.status !== 'CANCELLED' ? order.totalAmount : 0), 0),
  );

  // Computed flattened list of items across loaded orders
  readonly flatItems = computed<FlatOrderItemRow[]>(() => {
    const list: FlatOrderItemRow[] = [];
    for (const order of this.orders()) {
      for (const item of order.items) {
        list.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableName: order.tableName,
          itemId: item.id,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
          status: item.status,
          notes: item.notes,
          isCustomSale: item.isCustomSale,
          cancellationReason: item.cancellationReason,
          cancelledByUserName: item.cancelledByUserName,
          createdByUserName: item.createdByUserName || order.createdByUserName,
          createdAt: item.createdAt || order.createdAt,
          order,
        });
      }
    }
    return list;
  });

  // Computed total sum of subtotal of visible non-cancelled items
  readonly flatItemsTotalSum = computed(() =>
    this.flatItems().reduce((sum, item) => sum + (item.status !== 'CANCELLED' ? item.subtotal : 0), 0),
  );

  ngOnInit(): void {
    this.loadOrders();
  }

  setTab(tab: 'orders' | 'items'): void {
    this.activeTab.set(tab);
    this.showColumnPicker.set(false);
  }

  loadOrders(): void {
    this.loading.set(true);

    const req: OrderQueryRequest = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      search: this.searchQuery(),
      statuses: this.selectedStatuses().length > 0 ? this.selectedStatuses() : null,
      fromDate: this.fromDate() ? new Date(this.fromDate()).toISOString() : null,
      toDate: this.toDate() ? new Date(this.toDate() + 'T23:59:59').toISOString() : null,
    };

    this.orderRepo.listOrders(req).subscribe({
      next: (res) => {
        this.orders.set(res.items);
        this.totalItems.set(res.totalItems);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
    this.loadOrders();
  }

  toggleStatus(status: string): void {
    const current = [...this.selectedStatuses()];
    const index = current.indexOf(status);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(status);
    }
    this.selectedStatuses.set(current);
    this.currentPage.set(1);
    this.loadOrders();
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  onDateFilterChange(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatuses.set([]);
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadOrders();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadOrders();
  }

  toggleColumnPicker(): void {
    this.showColumnPicker.update((v) => !v);
  }

  activeColumns(): ColumnDefinition[] {
    return this.activeTab() === 'orders' ? this.orderColumns() : this.itemColumns();
  }

  toggleColumn(colId: string): void {
    if (this.activeTab() === 'orders') {
      const updated = this.orderColumns().map((c) =>
        c.id === colId ? { ...c, visible: !c.visible } : c,
      );
      this.orderColumns.set(updated);
    } else {
      const updated = this.itemColumns().map((c) =>
        c.id === colId ? { ...c, visible: !c.visible } : c,
      );
      this.itemColumns.set(updated);
    }
  }

  isColumnVisible(colId: string): boolean {
    const cols = this.activeTab() === 'orders' ? this.orderColumns() : this.itemColumns();
    return cols.find((c) => c.id === colId)?.visible ?? true;
  }

  openOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
  }

  closeOrderDetails(): void {
    this.selectedOrder.set(null);
  }
}
