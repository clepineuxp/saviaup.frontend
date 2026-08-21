import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { ProductCategory } from '../models/product.model';
import { ProductFormComponent } from './product-form.component';

const inventoryCategory: ProductCategory = {
  id: 'category-inventory',
  name: 'Bebidas',
  isInventoryTracked: true,
};
const serviceCategory: ProductCategory = {
  id: 'category-service',
  name: 'Servicios',
  isInventoryTracked: false,
};

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFormComponent);
    fixture.componentRef.setInput('product', null);
    fixture.componentRef.setInput('categories', [inventoryCategory, serviceCategory]);
    fixture.detectChanges();
    TestBed.flushEffects();
    component = fixture.componentInstance;
  });

  it('starts new products as NORMAL and validates positive prices', () => {
    expect(component.form.controls.type.value).toBe('NORMAL');

    component.form.controls.name.setValue('Hamburguesa');
    component.form.controls.categoryId.setValue(inventoryCategory.id);
    component.form.controls.salePrice.setValue(0);

    expect(component.form.controls.salePrice.hasError('min')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('enables inventory only for inventory-tracked categories', () => {
    component.form.controls.categoryId.setValue(inventoryCategory.id);
    TestBed.flushEffects();
    expect(component.form.controls.isInventoryTracked.enabled).toBe(true);

    component.form.controls.isInventoryTracked.setValue(true);
    component.form.controls.categoryId.setValue(serviceCategory.id);
    TestBed.flushEffects();

    expect(component.form.controls.isInventoryTracked.disabled).toBe(true);
    expect(component.form.controls.isInventoryTracked.value).toBe(false);
  });

  it('normalizes form values and never submits inventory for a non-inventory category', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.controls.categoryId.setValue(serviceCategory.id);
    component.form.controls.name.setValue('  Menú   infantil ');
    component.form.controls.salePrice.setValue(25000);
    component.form.controls.description.setValue('  Con bebida  ');
    component.form.controls.imageUrl.setValue('');
    component.form.controls.preparationTimeMinutes.setValue(12);
    TestBed.flushEffects();

    component.submit();

    expect(submitted).toEqual([
      {
        type: 'NORMAL',
        categoryId: serviceCategory.id,
        name: 'Menú infantil',
        salePrice: 25000,
        description: 'Con bebida',
        imageUrl: null,
        preparationTimeMinutes: 12,
        isInventoryTracked: false,
      },
    ]);
  });
});
