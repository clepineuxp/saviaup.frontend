import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { HttpSettingsRepository } from '../../settings/data-access/http-settings.repository';
import { CashRegisterRepository } from '../data-access/cash-register.repository';
import { CashRegister } from '../models/cash-register.model';
import { CashRegisterPageComponent } from './cash-register-page.component';

const sampleRegisters: readonly CashRegister[] = [
  {
    id: 'reg-1',
    name: 'Caja Principal',
    location: 'Mostrador',
    isActive: true,
    hasOpenShift: false,
    createdAt: '2026-08-21T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z',
  },
];

describe('CashRegisterPageComponent', () => {
  let fixture: ComponentFixture<CashRegisterPageComponent>;
  let component: CashRegisterPageComponent;

  const mockRepository = {
    list: vi.fn(() => of(sampleRegisters)),
    create: vi.fn(() => of({})),
    update: vi.fn(() => of({})),
    setStatus: vi.fn(() => of({})),
    delete: vi.fn(() => of(undefined)),
    openShift: vi.fn(() => of({})),
    closeShift: vi.fn(() => of({})),
    getShiftSummary: vi.fn(() => of({ methodSummaries: [] })),
    getShiftsPage: vi.fn(() => of({ items: [], pageNumber: 1, pageSize: 15, totalItems: 0, totalPages: 0 })),
  };

  const mockSettingsRepo = {
    listPaymentMethods: vi.fn(() =>
      of([{ id: 'pm-1', name: 'Efectivo', isIncludedInCashOpening: true, isActive: true }]),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [CashRegisterPageComponent],
      providers: [
        { provide: CashRegisterRepository, useValue: mockRepository },
        { provide: HttpSettingsRepository, useValue: mockSettingsRepo },
        {
          provide: AuthStore,
          useValue: {
            user: () => ({ permissions: ['cash-registers.manage'] }),
          },
        },
        {
          provide: LocalizationService,
          useValue: {
            language: () => 'es',
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashRegisterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders list of cash registers and displays section header', () => {
    const title = fixture.debugElement.query(By.css('.page-header h2'));
    expect(title.nativeElement.textContent).toContain('Apertura, Arqueo y Cierre de Cajas');

    const cards = fixture.debugElement.queryAll(By.css('.register-card'));
    expect(cards.length).toBe(1);
  });
});
