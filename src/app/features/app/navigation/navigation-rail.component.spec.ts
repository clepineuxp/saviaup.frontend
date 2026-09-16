import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { SectionNavigationItem } from './module-navigation.config';
import { NavigationRailComponent } from './navigation-rail.component';

const sections: readonly SectionNavigationItem[] = [
  {
    code: 'sales',
    name: 'Ventas',
    order: 1,
    isGrouped: false,
    items: [
      {
        id: 'tables',
        code: 'tables',
        moduleCode: 'tables',
        name: 'Mesas',
        order: 1,
        path: 'tables',
        route: '/app/tables',
        icon: 'tables',
        kind: 'module',
      },
    ],
  },
];

describe('NavigationRailComponent', () => {
  let fixture: ComponentFixture<NavigationRailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationRailComponent],
      providers: [
        provideRouter([]),
        {
          provide: LocalizationService,
          useValue: {
            language: signal('es').asReadonly(),
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationRailComponent);
    fixture.componentRef.setInput('sections', sections);
    fixture.detectChanges();
  });

  it('shows edge controls and scrolls a horizontally overflowing mobile rail', () => {
    const scroller = fixture.debugElement.query(By.css('.module-navigation'))
      .nativeElement as HTMLElement;
    const scrollBy = vi.fn();
    Object.defineProperties(scroller, {
      clientWidth: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 600 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollBy: { configurable: true, value: scrollBy },
    });

    fixture.componentInstance.updateScrollState();
    fixture.detectChanges();

    const left = fixture.debugElement.query(By.css('.navigation-scroll--left'));
    const right = fixture.debugElement.query(By.css('.navigation-scroll--right'));
    expect(left.nativeElement.disabled).toBe(true);
    expect(right.nativeElement.disabled).toBe(false);

    right.nativeElement.click();
    expect(scrollBy).toHaveBeenCalledWith({ left: 160, behavior: 'smooth' });
  });
});
