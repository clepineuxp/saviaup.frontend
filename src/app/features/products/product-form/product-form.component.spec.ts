import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { ImageService } from '../../../shared/services/image.service';
import { CreateProductRequest, Product, ProductCategory } from '../models/product.model';
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
const product: Product = {
  id: 'product-1',
  type: 'NORMAL',
  name: 'Limonada',
  description: null,
  image: null,
  category: inventoryCategory,
  salePrice: 8000,
  preparationTimeMinutes: null,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
  recipe: [],
  variations: [],
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
        {
          provide: ImageService,
          useValue: { upload: vi.fn(), delete: vi.fn() },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFormComponent);
    fixture.componentRef.setInput('product', null);
    fixture.componentRef.setInput('categories', [inventoryCategory, serviceCategory]);
    fixture.componentRef.setInput('comboProducts', [product]);
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

  it('normalizes form values and includes recipe items', () => {
    const submitted: unknown[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.controls.categoryId.setValue(serviceCategory.id);
    component.form.controls.name.setValue('  Menú   infantil ');
    component.form.controls.salePrice.setValue(25000);
    component.form.controls.description.setValue('  Con bebida  ');
    component.form.controls.image.setValue('');
    component.form.controls.preparationTimeMinutes.setValue(12);

    // Agregar ingrediente libre
    component.addCustomIngredient();
    component.updateRow(0, {
      customIngredientName: 'Salsa especial',
      quantity: 2,
      notes: 'Casera',
    });
    TestBed.flushEffects();

    component.submit();

    expect(submitted).toEqual([
      {
        type: 'NORMAL',
        categoryId: serviceCategory.id,
        name: 'Menú infantil',
        salePrice: 25000,
        description: 'Con bebida',
        image: null,
        preparationTimeMinutes: 12,
        isInventoryTracked: false,
        recipe: [
          {
            ingredientId: null,
            customIngredientName: 'Salsa especial',
            quantity: 2,
            notes: 'Casera',
            order: 1,
          },
        ],
      },
    ]);
  });

  it('removes the base price when a normal product has variations', () => {
    const submitted: CreateProductRequest[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.patchValue({
      categoryId: inventoryCategory.id,
      name: 'Limonada',
      salePrice: 8000,
    });

    component.addVariationRow();
    component.updateVariationRow(0, { name: 'Grande', salePrice: 12000 });
    TestBed.flushEffects();

    expect(component.form.controls.salePrice.disabled).toBe(true);
    expect(component.form.controls.salePrice.value).toBeNull();
    component.submit();

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      salePrice: null,
      variations: [{ name: 'Grande', salePrice: 12000 }],
    });
  });

  it('exposes deactivation and deletion actions while editing a product', () => {
    const statusRequested: Product[] = [];
    const deleteRequested: Product[] = [];
    component.statusRequested.subscribe((value) => statusRequested.push(value));
    component.deleteRequested.subscribe((value) => deleteRequested.push(value));
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    TestBed.flushEffects();

    (fixture.nativeElement.querySelector('.form-status-action') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.form-delete-action') as HTMLButtonElement).click();

    expect(statusRequested).toEqual([product]);
    expect(deleteRequested).toEqual([product]);
  });

  it('builds a combo with required multiple selections and price adjustments', () => {
    const submitted: CreateProductRequest[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.patchValue({
      type: 'COMBO',
      categoryId: inventoryCategory.id,
      name: 'Combo desayuno',
      salePrice: 22000,
      isInventoryTracked: true,
    });
    TestBed.flushEffects();
    component.addComboGroup();
    component.updateComboGroup(0, {
      name: 'Acompañantes',
      selectionType: 'MULTIPLE',
      isRequired: true,
      minSelections: 1,
      maxSelections: 2,
    });
    component.addComboOption(0);
    component.updateComboOption(0, 0, { productQuantity: 2, priceAdjustment: 1500 });

    component.submit();

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      type: 'COMBO',
      isInventoryTracked: false,
      recipe: [],
      comboGroups: [
        {
          name: 'Acompañantes',
          selectionType: 'MULTIPLE',
          isRequired: true,
          minSelections: 1,
          maxSelections: 2,
          options: [{ productId: product.id, productQuantity: 2, priceAdjustment: 1500 }],
        },
      ],
    });
  });

  it('normalizes a fixed group so every configured product is always included', () => {
    const submitted: CreateProductRequest[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.patchValue({
      type: 'COMBO',
      categoryId: inventoryCategory.id,
      name: 'Combo fijo',
      salePrice: 18000,
    });
    TestBed.flushEffects();
    component.addComboGroup();
    component.updateComboGroup(0, { name: 'Incluidos', selectionType: 'FIXED' });
    component.addComboOption(0);
    component.updateComboOption(0, 0, { productQuantity: 2, priceAdjustment: -500 });

    component.submit();

    expect(submitted[0].comboGroups?.[0]).toMatchObject({
      name: 'Incluidos',
      selectionType: 'FIXED',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      options: [{ productId: product.id, productQuantity: 2, priceAdjustment: -500 }],
    });
  });

  it('filters products and variations and submits the selected variation for a combo', () => {
    const variationProduct: Product = {
      ...product,
      variations: [
        {
          id: 'variation-large',
          name: 'Presentación grande',
          salePrice: 12000,
          order: 1,
          isActive: true,
        },
      ],
    };
    fixture.componentRef.setInput('comboProducts', [variationProduct]);
    fixture.detectChanges();
    TestBed.flushEffects();
    const submitted: CreateProductRequest[] = [];
    component.submitted.subscribe((request) => submitted.push(request));
    component.form.patchValue({
      type: 'COMBO',
      categoryId: inventoryCategory.id,
      name: 'Combo con variación',
      salePrice: 25000,
    });
    TestBed.flushEffects();
    component.addComboGroup();
    component.updateComboGroup(0, { name: 'Bebida', selectionType: 'SINGLE' });
    component.addComboOption(0);
    component.comboCatalogSearch.set('grande');

    const filtered = component.filteredComboCatalogOptions();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].productVariationId).toBe('variation-large');
    expect(
      component.comboCatalogOptions().some((option) => option.productVariationId === null),
    ).toBe(false);
    component.selectComboCatalogOption(0, 0, filtered[0]);
    component.submit();

    expect(submitted[0].comboGroups?.[0].options[0]).toMatchObject({
      productId: product.id,
      productVariationId: 'variation-large',
    });
  });
});
