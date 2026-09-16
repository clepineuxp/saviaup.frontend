import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { NavigationSection, UserInfo } from '../../../core/context/authenticated-context.model';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { AppPlaceholderComponent } from './app-placeholder.component';

describe('AppPlaceholderComponent', () => {
  it('shows the exact empty-state copy returned by the backend', async () => {
    const sections = signal<readonly NavigationSection[]>([]);
    const emptyStateMessage = signal<string | null>(
      'No tienes módulos disponibles. Habla con el administrador de tu organización.',
    );
    const userInfo = signal<UserInfo | null>(null);

    await TestBed.configureTestingModule({
      imports: [AppPlaceholderComponent],
      providers: [
        {
          provide: AuthenticatedContextStore,
          useValue: {
            sections: sections.asReadonly(),
            emptyStateMessage: emptyStateMessage.asReadonly(),
            userInfo: userInfo.asReadonly(),
          },
        },
        {
          provide: LocalizationService,
          useValue: { language: signal('es').asReadonly(), translate: (key: string) => key },
        },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<AppPlaceholderComponent> =
      TestBed.createComponent(AppPlaceholderComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(emptyStateMessage());
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });
});
