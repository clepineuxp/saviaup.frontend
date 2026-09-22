import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import {
  AvailableModule,
  NavigationOption,
} from '../../../core/context/authenticated-context.model';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { TableMetrics } from '../models/table.model';
import { MetricsHeaderComponent } from './metrics-header.component';

const metrics: TableMetrics = {
  available: 4,
  occupied: 2,
  activeSalesTotal: 45_000,
  todaySalesTotal: 120_000,
  todayExpensesTotal: 25_000,
};

describe('MetricsHeaderComponent', () => {
  let fixture: ComponentFixture<MetricsHeaderComponent>;
  const modules = signal<readonly AvailableModule[]>([
    { id: 'orders', code: 'orders', name: 'Pedidos', order: 1 },
    { id: 'expenses', code: 'expenses', name: 'Gastos', order: 2 },
    { id: 'statistics', code: 'statistics', name: 'Estadísticas', order: 3 },
  ]);
  const options = signal<readonly NavigationOption[]>([]);
  const navigate = vi.fn(() => Promise.resolve(true));

  beforeEach(async () => {
    modules.set([
      { id: 'orders', code: 'orders', name: 'Pedidos', order: 1 },
      { id: 'expenses', code: 'expenses', name: 'Gastos', order: 2 },
      { id: 'statistics', code: 'statistics', name: 'Estadísticas', order: 3 },
    ]);
    options.set([]);
    navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [MetricsHeaderComponent],
      providers: [
        {
          provide: AuthenticatedContextStore,
          useValue: { modules: modules.asReadonly(), options: options.asReadonly() },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricsHeaderComponent);
    fixture.componentRef.setInput('metrics', metrics);
    fixture.detectChanges();
  });

  it('requires a second click before navigating to the permitted orders summary', () => {
    const salesCard = fixture.nativeElement.querySelector('.metric--sales') as HTMLElement;

    salesCard.click();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(salesCard.textContent).toContain('tables.metrics.goToSummary');

    salesCard.click();

    expect(navigate).toHaveBeenCalledWith(['/app/orders']);
  });

  it('clears the pending redirect when another area is clicked', () => {
    const salesCard = fixture.nativeElement.querySelector('.metric--sales') as HTMLElement;
    salesCard.click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.metric--tables').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.summary-navigation-hint')).toBeNull();
  });

  it('keeps the confirmation independent for each sales card', () => {
    const tableSalesCard = fixture.nativeElement.querySelector('.metric--sales') as HTMLElement;
    const periodSalesCard = fixture.nativeElement.querySelector(
      '.metric--dynamic-sales',
    ) as HTMLElement;

    tableSalesCard.click();
    fixture.detectChanges();
    periodSalesCard.click();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(tableSalesCard.querySelector('.summary-navigation-hint')).toBeNull();
    expect(periodSalesCard.querySelector('.summary-navigation-hint')).not.toBeNull();
  });

  it('does not enable a card when its destination module is unavailable', () => {
    modules.set([]);
    fixture.detectChanges();

    const salesCard = fixture.nativeElement.querySelector('.metric--sales') as HTMLElement;
    salesCard.click();

    expect(salesCard.getAttribute('role')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
