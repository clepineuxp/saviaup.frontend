import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { RestaurantTable } from '../models/table.model';
import { TableLayoutEditorComponent } from './table-layout-editor.component';

describe('TableLayoutEditorComponent', () => {
  let fixture: ComponentFixture<TableLayoutEditorComponent>;
  const table: RestaurantTable = {
    id: 'table-1',
    diningAreaId: 'area-1',
    name: 'Mesa 01',
    capacity: 4,
    positionX: 20,
    positionY: 30,
    shape: 'RECTANGLE_HORIZONTAL',
    isDelivery: false,
    isCashRegister: false,
    status: 'AVAILABLE',
    activeOrderId: null,
    activeOrderTotal: 0,
    occupiedAt: null,
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableLayoutEditorComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: {
            language: () => 'es',
            translate: (key: string, variables?: Record<string, string | number>) =>
              variables ? `${key}:${variables['capacity']}` : key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableLayoutEditorComponent);
    fixture.componentRef.setInput('tables', [table]);
    fixture.detectChanges();
  });

  it('moves a table with the keyboard and emits the persisted coordinates', () => {
    const changed = vi.fn();
    fixture.componentInstance.positionChanged.subscribe(changed);
    const button = fixture.nativeElement.querySelector('.layout-table') as HTMLButtonElement;

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(changed).toHaveBeenCalledWith({ table, positionX: 30, positionY: 30 });
    expect(button.style.left).toBe('62px');
    expect(button.style.width).toBe('150px');
  });

  it('uses one-pixel increments while Shift is held', () => {
    const changed = vi.fn();
    fixture.componentInstance.positionChanged.subscribe(changed);
    const button = fixture.nativeElement.querySelector('.layout-table') as HTMLButtonElement;

    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }),
    );

    expect(changed).toHaveBeenCalledWith({ table, positionX: 20, positionY: 31 });
  });

  it('requests table editing on double click', () => {
    const editRequested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(editRequested);
    const tableNode = fixture.nativeElement.querySelector('.layout-table') as HTMLElement;

    tableNode.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(editRequested).toHaveBeenCalledWith(table);
  });
});
