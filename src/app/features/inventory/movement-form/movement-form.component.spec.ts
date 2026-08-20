import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { Ingredient } from '../models/inventory.model';
import { MovementFormComponent } from './movement-form.component';

const ingredient: Ingredient = {
  id: 'ingredient-1',
  name: 'Café',
  description: null,
  category: { id: 'category-1', name: 'Materia prima', isInventoryTracked: true },
  unit: {
    id: 'unit-1',
    code: 'GR',
    name: 'Gramos',
    isActive: true,
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z',
  },
  minimumStock: 2,
  currentStock: 15,
  isBelowMinimum: false,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};

describe('MovementFormComponent', () => {
  let fixture: ComponentFixture<MovementFormComponent>;
  let component: MovementFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementFormComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MovementFormComponent);
    fixture.componentRef.setInput('ingredients', [ingredient]);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('changes allowed reasons and clears an incompatible selection', () => {
    component.form.controls.reason.setValue('purchase');
    component.form.controls.direction.setValue('decrease');

    expect(component.reasons()).toEqual(['expiration', 'loss', 'waste']);
    expect(component.form.controls.reason.value).toBe('');
  });

  it('keeps entered values when the API reports insufficient stock', () => {
    component.form.setValue({
      ingredientId: ingredient.id,
      direction: 'decrease',
      reason: 'waste',
      quantity: 50,
      note: 'Ajustar cantidad',
    });
    fixture.componentRef.setInput('error', {
      status: 422,
      code: 'INVENTORY_INSUFFICIENT_STOCK',
      message: 'Insufficient stock',
      fieldErrors: {},
    });
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({
      ingredientId: ingredient.id,
      direction: 'decrease',
      reason: 'waste',
      quantity: 50,
      note: 'Ajustar cantidad',
    });
  });
});
