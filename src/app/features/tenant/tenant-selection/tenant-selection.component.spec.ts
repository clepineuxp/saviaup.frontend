import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { SupportedLanguage } from '../../../shared/i18n/translation.types';
import { TenantStore } from '../data-access/tenant-store.service';
import { Tenant } from '../models/tenant.model';
import { TenantSelectionComponent } from './tenant-selection.component';

const tenant: Tenant = {
  id: 'tenant-1',
  name: 'Secret Garden',
  roleId: 'role-1',
  roleName: 'Administrador',
};

@Component({ template: '' })
class EmptyTestComponent {}

describe('TenantSelectionComponent', () => {
  let fixture: ComponentFixture<TenantSelectionComponent>;
  const select = vi.fn(() => of(undefined));
  const load = vi.fn(() => of([tenant]));
  const language = signal<SupportedLanguage>('es');

  beforeEach(async () => {
    select.mockClear();
    load.mockClear();
    await TestBed.configureTestingModule({
      imports: [TenantSelectionComponent],
      providers: [
        provideRouter([{ path: 'app', component: EmptyTestComponent }]),
        {
          provide: TenantStore,
          useValue: {
            tenants: signal<readonly Tenant[]>([tenant]).asReadonly(),
            loading: signal(false).asReadonly(),
            error: signal<string | null>(null).asReadonly(),
            load,
            select,
          },
        },
        {
          provide: LocalizationService,
          useValue: {
            language: language.asReadonly(),
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantSelectionComponent);
    fixture.detectChanges();
  });

  it('loads and renders available tenants', () => {
    expect(load).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Secret Garden');
  });

  it('selects a tenant from its card', () => {
    const card = fixture.debugElement.query(By.css('button.tenant-card'));
    card.triggerEventHandler('click');
    expect(select).toHaveBeenCalledWith(tenant);
  });
});
