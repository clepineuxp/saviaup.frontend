import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { CategoryReference, Ingredient, MeasurementUnit } from '../models/inventory.model';
import { IngredientFormComponent } from './ingredient-form.component';

const category: CategoryReference = {
  id: 'category-1',
  name: 'Materia prima',
  isInventoryTracked: true,
};
const unit: MeasurementUnit = {
  id: 'unit-1',
  code: 'GR',
  name: 'Gramos',
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};
const ingredient: Ingredient = {
  id: 'ingredient-1',
  name: 'Café',
  description: null,
  category,
  unit,
  minimumStock: 2,
  currentStock: 15,
  isBelowMinimum: false,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T12:00:00Z',
  updatedAt: '2026-08-20T12:00:00Z',
};

describe('IngredientFormComponent', () => {
  let fixture: ComponentFixture<IngredientFormComponent>;
  let component: IngredientFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientFormComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(IngredientFormComponent);
    fixture.componentRef.setInput('ingredient', null);
    fixture.componentRef.setInput('categories', [category]);
    fixture.componentRef.setInput('units', [unit]);
    fixture.detectChanges();
    TestBed.flushEffects();
    component = fixture.componentInstance;
  });

  it('validates required lookups and non-negative stock values', () => {
    component.form.controls.categoryId.setValue('');
    component.form.controls.measurementUnitId.setValue('');
    component.form.controls.name.setValue('   ');
    component.form.controls.minimumStock.setValue(-1);
    component.form.controls.initialStock.setValue(-1);

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.minimumStock.hasError('min')).toBe(true);
    expect(component.form.controls.initialStock.hasError('min')).toBe(true);
  });

  it('includes initialStock on create and omits it on update', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.setValue({
      categoryId: category.id,
      measurementUnitId: unit.id,
      name: '  Café   molido ',
      description: ' ',
      minimumStock: 3,
      initialStock: 8,
    });
    component.submit();

    fixture.componentRef.setInput('ingredient', ingredient);
    fixture.detectChanges();
    TestBed.flushEffects();
    component.form.controls.name.setValue('Café tostado');
    component.submit();

    expect(submitted[0]).toMatchObject({ name: 'Café molido', initialStock: 8 });
    expect(submitted[1]).toEqual({
      categoryId: category.id,
      measurementUnitId: unit.id,
      name: 'Café tostado',
      description: null,
      minimumStock: 2,
    });
    expect(submitted[1]).not.toHaveProperty('initialStock');
  });
});
