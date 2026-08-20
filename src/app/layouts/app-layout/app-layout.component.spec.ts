import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../core/auth/auth-store.service';
import { AuthenticatedContextStore } from '../../core/context/authenticated-context.store';
import { NavigationSection, UserInfo } from '../../core/context/authenticated-context.model';
import { ActiveTenant, TenantContext } from '../../core/tenant/tenant-context.service';
import { LocalizationService } from '../../shared/i18n/localization.service';
import { SupportedLanguage } from '../../shared/i18n/translation.types';
import { RequestStatus } from '../../shared/models/request-state.model';
import { AppLayoutComponent } from './app-layout.component';

const userInfo: UserInfo = {
  firstName: 'Ana',
  lastName: 'Prueba',
  organization: { id: 'tenant-1', name: 'Secret Garden' },
  role: { id: 'role-1', code: 'TENANT_OWNER', name: 'Owner' },
};

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  const sections = signal<readonly NavigationSection[]>([]);
  const currentUser = signal<UserInfo | null>(userInfo);
  const status = signal<RequestStatus>('success');
  const error = signal<string | null>(null);
  const emptyStateMessage = signal<string | null>(null);
  const language = signal<SupportedLanguage>('es');
  const activeTenant = signal<ActiveTenant | null>({ id: 'tenant-1', name: 'Secret Garden' });
  const ensureLoaded = vi.fn(() => of({ userInfo, sections: [], emptyStateMessage: null }));
  const load = vi.fn(() => of({ userInfo, sections: [], emptyStateMessage: null }));
  const clearContext = vi.fn();

  beforeEach(async () => {
    sections.set([
      {
        code: 'sales',
        name: 'Ventas del backend',
        order: 1,
        isGrouped: false,
        modules: [{ id: 'tables', code: 'tables', name: 'Mesas del backend', order: 1 }],
        options: [],
      },
      {
        code: 'operation',
        name: 'Operación del backend',
        order: 2,
        isGrouped: true,
        modules: [
          { id: 'orders', code: 'orders', name: 'Pedidos del backend', order: 1 },
          { id: 'reports', code: 'reports', name: 'Informes del backend', order: 2 },
        ],
        options: [
          {
            code: 'products.manage',
            moduleCode: 'products',
            name: 'Administrar productos del backend',
            order: 3,
          },
        ],
      },
    ]);
    currentUser.set(userInfo);
    status.set('success');
    error.set(null);
    language.set('es');
    ensureLoaded.mockClear();
    load.mockClear();
    clearContext.mockClear();

    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthenticatedContextStore,
          useValue: {
            sections: sections.asReadonly(),
            userInfo: currentUser.asReadonly(),
            status: status.asReadonly(),
            error: error.asReadonly(),
            emptyStateMessage: emptyStateMessage.asReadonly(),
            loading: computed(() => status() === 'loading'),
            ready: computed(() => status() === 'success'),
            displayName: computed(() => 'Ana Prueba'),
            ensureLoaded,
            load,
            clear: clearContext,
          },
        },
        {
          provide: TenantContext,
          useValue: {
            activeTenant: activeTenant.asReadonly(),
            clear: vi.fn(),
          },
        },
        { provide: AuthStore, useValue: { logout: () => of(undefined) } },
        {
          provide: LocalizationService,
          useValue: {
            language: language.asReadonly(),
            setLanguage: (value: SupportedLanguage) => language.set(value),
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
  });

  it('renders a direct item and keeps grouped options collapsed behind the section name', () => {
    const links = fixture.debugElement.queryAll(By.css('a.module-link'));
    const directLinks = fixture.debugElement.queryAll(
      By.css('.module-navigation > app-navigation-item a.module-link'),
    );
    const operationGroup = fixture.debugElement.query(By.css('[data-section-code="operation"]'));
    const trigger = operationGroup.query(By.css('.navigation-group__trigger'));

    expect(ensureLoaded).toHaveBeenCalledOnce();
    expect(links.map((link) => link.nativeElement.textContent.trim())).toEqual([
      '▦Mesas del backend',
    ]);
    expect(directLinks.map((link) => link.nativeElement.textContent.trim())).toEqual([
      '▦Mesas del backend',
    ]);
    expect(operationGroup.nativeElement.textContent).toContain('Operación del backend');
    expect(trigger.attributes['aria-expanded']).toBe('false');
    expect(operationGroup.query(By.css('.navigation-popover'))).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ventas del backend');
    expect(fixture.nativeElement.textContent).not.toContain('Configuración');
    expect(fixture.nativeElement.textContent).toContain('Ana Prueba');
    expect(fixture.nativeElement.textContent).toContain('Secret Garden · Owner');
  });

  it('expands and collapses a grouped section as an options popover', () => {
    const operationGroup = fixture.debugElement.query(By.css('[data-section-code="operation"]'));
    const trigger = operationGroup.query(By.css('.navigation-group__trigger'));

    trigger.nativeElement.click();
    fixture.detectChanges();

    const popover = operationGroup.query(By.css('.navigation-popover'));
    expect(trigger.attributes['aria-expanded']).toBe('true');
    expect(popover).not.toBeNull();
    expect(popover.attributes['role']).toBe('group');
    expect(
      popover
        .queryAll(By.css('a.module-link'))
        .map((link) => link.nativeElement.textContent.trim()),
    ).toEqual([
      '≡Pedidos del backend',
      '↗Informes del backend',
      '◇Administrar productos del backend',
    ]);

    trigger.nativeElement.click();
    fixture.detectChanges();

    expect(trigger.attributes['aria-expanded']).toBe('false');
    expect(operationGroup.query(By.css('.navigation-popover'))).toBeNull();
  });

  it('closes an expanded section with Escape', () => {
    const trigger = fixture.debugElement.query(By.css('.navigation-group__trigger'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.navigation-popover'))).toBeNull();
  });

  it('does not render module links while contextual data is loading', () => {
    status.set('loading');
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('a.module-link'))).toHaveLength(0);
    expect(fixture.debugElement.query(By.css('.context-loader'))).not.toBeNull();
  });

  it('shows the error state and retries the complete context load', () => {
    status.set('error');
    error.set('No se pudo cargar');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('app-ui-button button')).nativeElement.click();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar');
    expect(load).toHaveBeenCalledOnce();
  });
});
