import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { Category } from '../models/category.model';
import { CategoryCardComponent } from './category-card.component';

const category: Category = {
  id: 'category-1',
  name: 'Bebidas frías',
  description: null,
  imageUrl: null,
  isInventoryTracked: true,
  isActive: true,
  createdAt: '2026-08-20T18:00:00Z',
  updatedAt: '2026-08-20T18:00:00Z',
};

describe('CategoryCardComponent', () => {
  let fixture: ComponentFixture<CategoryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCardComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryCardComponent);
  });

  it('uses the category placeholder when there is no image', () => {
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="category-image-placeholder"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('falls back to the placeholder when the remote image fails', () => {
    fixture.componentRef.setInput('category', {
      ...category,
      imageUrl: 'https://example.com/missing.webp',
    });
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="category-image-placeholder"]'),
    ).not.toBeNull();
  });

  it('does not render administrative actions in read-only mode', () => {
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('canManage', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.category-card__actions')).toBeNull();
  });
});
