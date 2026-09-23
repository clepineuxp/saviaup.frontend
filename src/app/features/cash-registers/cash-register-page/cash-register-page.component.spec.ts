import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { TRANSLATION_REPOSITORY } from '../../../shared/i18n/translation.repository';
import { HttpSettingsRepository } from '../../settings/data-access/http-settings.repository';
import { CashRegisterRepository } from '../data-access/cash-register.repository';
import { CashRegister, CashRegisterShift } from '../models/cash-register.model';
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

  const mockRepository = {
    list: vi.fn(() => of(sampleRegisters)),
    create: vi.fn(() => of({})),
    update: vi.fn(() => of({})),
    setStatus: vi.fn(() => of({})),
    delete: vi.fn(() => of(undefined)),
    openShift: vi.fn(() => of({})),
    closeShift: vi.fn(() => of({})),
    getShiftSummary: vi.fn(() => of({ methodSummaries: [] })),
    getShiftsPage: vi.fn(() =>
      of({ items: [], pageNumber: 1, pageSize: 15, totalItems: 0, totalPages: 0 }),
    ),
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
          provide: TRANSLATION_REPOSITORY,
          useValue: { load: () => of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashRegisterPageComponent);
    fixture.detectChanges();
  });

  it('renders list of cash registers and displays section header', () => {
    const title = fixture.debugElement.query(By.css('.page-header h2'));
    expect(title.nativeElement.textContent).toContain('Control de Caja Registradora');

    const cards = fixture.debugElement.queryAll(By.css('.register-card'));
    expect(cards.length).toBe(1);
  });

  it('shows the initial amount and the calculated total in cash for each shift', () => {
    const shift: CashRegisterShift = {
      id: 'shift-1',
      cashRegisterId: 'reg-1',
      cashRegisterName: 'Caja Principal',
      status: 'CLOSED',
      openedByUserId: 'user-1',
      openedByUserName: 'apertura@saviaup.com',
      openedAt: '2026-09-23T13:00:00Z',
      closedByUserId: 'user-2',
      closedByUserName: 'cierre@saviaup.com',
      closedAt: '2026-09-23T21:00:00Z',
      totalSalesAmount: 450_000,
      totalTipsAmount: 16_000,
      totalCollectedAmount: 466_000,
      totalExpensesAmount: 66_000,
      initialOpeningAmount: 125_000,
      totalInCashAmount: 525_000,
      openingBalancesJson: '[]',
      closingSummaryJson: null,
    };

    fixture.componentInstance.shiftsPage.set({
      items: [shift],
      pageNumber: 1,
      pageSize: 15,
      totalItems: 1,
      totalPages: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.initial-text').textContent).toContain('125,000');
    expect(fixture.nativeElement.querySelector('.total-text').textContent).toContain('525,000');
  });
});
