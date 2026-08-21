import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { TableCardComponent } from './table-card.component';
import { RestaurantTable } from '../models/table.model';

describe('TableCardComponent', () => {
  let fixture: ComponentFixture<TableCardComponent>;
  const table: RestaurantTable = {
    id: 'table-1',
    diningAreaId: 'area-1',
    name: 'Mesa 01',
    capacity: 4,
    positionX: 0,
    positionY: 0,
    shape: 'ROUND',
    isDelivery: false,
    isCashRegister: false,
    status: 'DISABLED',
    activeOrderId: null,
    activeOrderTotal: 0,
    occupiedAt: null,
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableCardComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TableCardComponent);
    fixture.componentRef.setInput('table', table);
    fixture.detectChanges();
  });

  it('disables interaction when the table is disabled', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('table-card--disabled')).toBe(true);
    expect(button.classList.contains('table-card--shape-round')).toBe(true);
    expect(fixture.nativeElement.style.width).toBe('100px');
    expect(button.querySelector('.table-card__status')).not.toBeNull();
  });
});
