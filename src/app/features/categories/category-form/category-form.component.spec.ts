import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { ImageService } from '../../../shared/services/image.service';
import { CategoryOperationError } from '../data-access/category-store.service';
import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let component: CategoryFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: {
            language: () => 'es',
            translate: (key: string) => key,
          },
        },
        {
          provide: ImageService,
          useValue: { upload: vi.fn(), delete: vi.fn() },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('validates name, description and absolute HTTP/HTTPS image URLs', () => {
    component.form.controls.name.setValue('');
    expect(component.form.controls.name.hasError('required')).toBe(true);
    component.form.controls.name.setValue('   ');
    expect(component.form.controls.name.hasError('required')).toBe(true);

    component.form.controls.name.setValue('a'.repeat(121));
    expect(component.form.controls.name.hasError('maxlength')).toBe(true);

    component.form.controls.name.setValue('Bebidas');
    component.form.controls.description.setValue('a'.repeat(1001));
    expect(component.form.controls.description.hasError('maxlength')).toBe(true);

    component.form.controls.description.setValue('Preparadas en barra');
    component.form.controls.image.setValue('/relative/image.webp');
    expect(component.form.controls.image.hasError('imageUrl')).toBe(true);
    component.form.controls.image.setValue('ftp://example.com/image.webp');
    expect(component.form.controls.image.hasError('imageUrl')).toBe(true);
    component.form.controls.image.setValue('https://example.com/image.webp');
    component.form.controls.isInventoryTracked.setValue(false);
    expect(component.form.valid).toBe(true);
  });

  it('normalizes optional values and internal name whitespace before submit', () => {
    let submitted: unknown;
    component.submitted.subscribe((value) => (submitted = value));
    component.form.setValue({
      name: '  Bebidas   frías  ',
      description: '   ',
      image: '  https://example.com/drinks.webp  ',
      isInventoryTracked: false,
    });

    component.submit();

    expect(submitted).toEqual({
      name: 'Bebidas frías',
      description: null,
      image: 'https://example.com/drinks.webp',
      isInventoryTracked: false,
    });
  });

  it('associates duplicate and validation errors with their fields', () => {
    const duplicate: CategoryOperationError = {
      status: 409,
      code: 'CATEGORY_NAME_ALREADY_EXISTS',
      message: 'Duplicate',
      fieldErrors: {},
    };
    fixture.componentRef.setInput('serverError', duplicate);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.form.controls.name.hasError('duplicate')).toBe(true);

    const validation: CategoryOperationError = {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation',
      fieldErrors: { Image: ['Invalid URL'] },
    };
    fixture.componentRef.setInput('serverError', validation);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.form.controls.image.hasError('server')).toBe(true);
  });
});
