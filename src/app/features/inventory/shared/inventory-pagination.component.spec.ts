import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { InventoryPaginationComponent } from './inventory-pagination.component';

describe('InventoryPaginationComponent', () => {
  let fixture: ComponentFixture<InventoryPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPaginationComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InventoryPaginationComponent);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('totalPages', 4);
    fixture.componentRef.setInput('totalCount', 75);
    fixture.detectChanges();
  });

  it('emits only adjacent server page requests', () => {
    const pages: number[] = [];
    fixture.componentInstance.pageChanged.subscribe((page) => pages.push(page));
    const buttons = fixture.debugElement.queryAll(By.css('button'));

    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(pages).toEqual([1, 3]);
  });

  it('does not render local pagination controls for a single page', () => {
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('nav'))).toBeNull();
  });
});
