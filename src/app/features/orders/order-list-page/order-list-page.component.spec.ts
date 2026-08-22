import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ORDER_REPOSITORY } from '../data-access/order.repository';
import { Order } from '../models/order.model';
import { OrderListPageComponent } from './order-list-page.component';
import { vi } from 'vitest';

describe('OrderListPageComponent', () => {
  let component: OrderListPageComponent;
  let fixture: ComponentFixture<OrderListPageComponent>;
  let listOrdersSpy: ReturnType<typeof vi.fn>;

  const dummyOrder: Order = {
    id: 'ord-1',
    tenantId: 'ten-1',
    tableId: 'tab-1',
    tableName: 'Mesa 5',
    orderNumber: 101,
    status: 'PAID',
    subtotalAmount: 50000,
    taxAmount: 0,
    tipAmount: 5000,
    totalAmount: 55000,
    paymentMethod: 'Efectivo',
    paymentDetailsJson: null,
    observations: 'Sin cebolla',
    createdByUserId: 'usr-1',
    createdByUserName: 'admin@saviaup.com',
    lastModifiedByUserId: null,
    lastModifiedByUserName: null,
    paidByUserId: 'usr-1',
    paidByUserName: 'admin@saviaup.com',
    paidAt: '2026-08-21T16:00:00Z',
    createdAt: '2026-08-21T15:30:00Z',
    updatedAt: '2026-08-21T16:00:00Z',
    items: [
      {
        id: 'item-1',
        orderId: 'ord-1',
        productId: 'prod-1',
        productName: 'Hamburguesa Especial',
        unitPrice: 25000,
        quantity: 2,
        subtotal: 50000,
        status: 'PAID',
        notes: null,
        isCustomSale: false,
        cancellationReason: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancelledByUserName: null,
        createdByUserId: 'usr-1',
        createdByUserName: 'admin@saviaup.com',
        lastModifiedByUserId: null,
        lastModifiedByUserName: null,
        createdAt: '2026-08-21T15:30:00Z',
        updatedAt: '2026-08-21T16:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    listOrdersSpy = vi.fn().mockReturnValue(
      of({
        items: [dummyOrder],
        pageNumber: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [OrderListPageComponent],
      providers: [
        {
          provide: ORDER_REPOSITORY,
          useValue: {
            listOrders: listOrdersSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load orders on initialization', () => {
    expect(component).toBeTruthy();
    expect(listOrdersSpy).toHaveBeenCalled();
    expect(component.orders().length).toBe(1);
    expect(component.orders()[0].orderNumber).toBe(101);
    expect(component.orders()[0].createdByUserName).toBe('admin@saviaup.com');
  });

  it('should compute totals sum for orders and flat items', () => {
    expect(component.ordersTotalSum()).toBe(55000);
    expect(component.flatItems().length).toBe(1);
    expect(component.flatItemsTotalSum()).toBe(50000);
  });

  it('should switch tabs between orders and items breakdown', () => {
    expect(component.activeTab()).toBe('orders');
    component.setTab('items');
    expect(component.activeTab()).toBe('items');
  });

  it('should toggle multi-status filters correctly', () => {
    component.toggleStatus('PENDING');
    expect(component.selectedStatuses()).toContain('PENDING');

    component.toggleStatus('PAID');
    expect(component.selectedStatuses()).toEqual(['PENDING', 'PAID']);

    component.toggleStatus('PENDING');
    expect(component.selectedStatuses()).toEqual(['PAID']);
  });

  it('should toggle column visibility dynamically', () => {
    expect(component.isColumnVisible('tableName')).toBe(true);
    component.toggleColumn('tableName');
    expect(component.isColumnVisible('tableName')).toBe(false);
  });

  it('should open and close order details modal', () => {
    expect(component.selectedOrder()).toBeNull();
    component.openOrderDetails(dummyOrder);
    expect(component.selectedOrder()).toEqual(dummyOrder);
    component.closeOrderDetails();
    expect(component.selectedOrder()).toBeNull();
  });
});
