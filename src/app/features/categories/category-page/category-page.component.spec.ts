import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { CategoryStore } from '../data-access/category-store.service';
import { Category } from '../models/category.model';
import { CategoryPageComponent } from './category-page.component';

const category: Category = {
  id: 'category-1',
  name: 'Bebidas frías',
  description: 'Preparadas en barra',
  imageUrl: null,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T18:00:00Z',
  updatedAt: '2026-08-20T18:00:00Z',
};

describe('CategoryPageComponent', () => {
  let fixture: ComponentFixture<CategoryPageComponent>;
  const categories = signal<readonly Category[]>([category]);
  const status = signal<'idle' | 'loading' | 'success' | 'error'>('success');
  const canManage = signal(true);
  const mutating = signal(false);
  const error = signal(null);
  const operationError = signal(null);
  const load = vi.fn(() => of(categories()));
  const deleteCategory = vi.fn(() => of(undefined));

  beforeEach(async () => {
    categories.set([category]);
    status.set('success');
    canManage.set(true);
    mutating.set(false);
    load.mockClear();
    deleteCategory.mockClear();
    await TestBed.configureTestingModule({
      imports: [CategoryPageComponent],
      providers: [
        {
          provide: CategoryStore,
          useValue: {
            categories: categories.asReadonly(),
            status: status.asReadonly(),
            loading: () => status() === 'loading',
            mutating: mutating.asReadonly(),
            canManage: canManage.asReadonly(),
            accessForbidden: () => false,
            error: error.asReadonly(),
            operationError: operationError.asReadonly(),
            load,
            create: vi.fn(() => of(category)),
            update: vi.fn(() => of(category)),
            setStatus: vi.fn(() => of(category)),
            delete: deleteCategory,
            clearOperationError: vi.fn(),
          },
        },
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryPageComponent);
  });

  it('shows an actionable empty state for category managers', () => {
    categories.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('categories.empty.title');
    expect(fixture.nativeElement.textContent).toContain('categories.empty.action');
  });

  it('renders a read-only page without management actions', () => {
    canManage.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('categories.readOnly.title');
    expect(fixture.nativeElement.querySelector('.category-card__actions')).toBeNull();
  });

  it('requires explicit confirmation before deleting', () => {
    fixture.detectChanges();
    const deleteAction = fixture.nativeElement.querySelector(
      '.category-card__actions .danger-action',
    ) as HTMLButtonElement;

    deleteAction.click();
    fixture.detectChanges();
    expect(deleteCategory).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).not.toBeNull();

    const confirm = fixture.nativeElement.querySelector(
      '.delete-confirmation',
    ) as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();
    expect(deleteCategory).toHaveBeenCalledWith(category.id);
  });
});
