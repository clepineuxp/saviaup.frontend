import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { SupportedLanguage } from '../../../shared/i18n/translation.types';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  const language = signal<SupportedLanguage>('es');
  const login = vi.fn(() => of({ session: null, nextStep: 'tenant-selection' as const }));

  beforeEach(async () => {
    login.mockClear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            loading: signal(false).asReadonly(),
            error: signal<string | null>(null).asReadonly(),
            login,
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

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires a valid email and password', () => {
    component.form.setValue({ email: 'not-an-email', password: '', rememberMe: false });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({
      email: 'admin@saviaup.local',
      password: 'Savia123*',
      rememberMe: true,
    });
    expect(component.form.valid).toBe(true);
  });

  it('does not submit an invalid form', () => {
    component.submit();
    expect(login).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
  });
});
