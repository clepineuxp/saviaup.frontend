import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { CashRegisterRepository } from '../data-access/cash-register.repository';
import { CashRegister } from '../models/cash-register.model';
import { CashRegisterManagementPageComponent } from './cash-register-management-page.component';

const sampleRegisters: readonly CashRegister[] = [
  {
    id: 'reg-1',
    name: 'Caja Principal',
    location: 'Mostrador',
    isActive: true,
    createdAt: '2026-08-21T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z',
  },
  {
    id: 'reg-2',
    name: 'Caja Secundaria',
    location: null,
    isActive: false,
    createdAt: '2026-08-21T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z',
  },
];

describe('CashRegisterManagementPageComponent', () => {
  let fixture: ComponentFixture<CashRegisterManagementPageComponent>;
  let component: CashRegisterManagementPageComponent;

  const mockRepository = {
    list: vi.fn(() => of(sampleRegisters)),
    create: vi.fn((req) =>
      of({
        id: 'reg-3',
        name: req.name,
        location: req.location ?? null,
        isActive: req.isActive ?? false,
        createdAt: '2026-08-21T00:00:00Z',
        updatedAt: '2026-08-21T00:00:00Z',
      }),
    ),
    update: vi.fn((id, req) =>
      of({
        id,
        name: req.name,
        location: req.location ?? null,
        isActive: req.isActive,
        createdAt: '2026-08-21T00:00:00Z',
        updatedAt: '2026-08-21T00:00:00Z',
      }),
    ),
    setStatus: vi.fn((id, req) =>
      of({
        id,
        name: 'Caja',
        location: null,
        isActive: req.isActive,
        createdAt: '2026-08-21T00:00:00Z',
        updatedAt: '2026-08-21T00:00:00Z',
      }),
    ),
    delete: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [CashRegisterManagementPageComponent],
      providers: [
        { provide: CashRegisterRepository, useValue: mockRepository },
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

    fixture = TestBed.createComponent(CashRegisterManagementPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders list of cash registers and identifies the single active register', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);

    const activeBanner = fixture.debugElement.query(By.css('.active-register-banner'));
    expect(activeBanner).not.toBeNull();
    expect(activeBanner.nativeElement.textContent).toContain('Caja Principal');
  });

  it('opens creation modal with form reset', () => {
    const addButton = fixture.debugElement.query(By.css('.header-actions app-ui-button button'));
    addButton.nativeElement.click();
    fixture.detectChanges();

    expect(component.isModalOpen()).toBe(true);
    expect(component.editingRegister()).toBeNull();
    expect(component.form.controls.name.value).toBe('');
  });

  it('submits new register form successfully', () => {
    component.openCreateModal();
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Caja Terraza',
      location: 'Barra Exterior',
      isActive: false,
    });

    component.saveRegister();
    fixture.detectChanges();

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: 'Caja Terraza',
      location: 'Barra Exterior',
      isActive: false,
    });
    expect(component.isModalOpen()).toBe(false);
  });
});
