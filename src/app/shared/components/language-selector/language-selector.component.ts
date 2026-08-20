import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LocalizationService } from '../../i18n/localization.service';
import { LanguageOption, SupportedLanguage } from '../../i18n/translation.types';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-language-selector',
  imports: [TranslatePipe],
  template: `
    <label class="selector">
      <span class="sr-only">{{ 'common.language' | translate }}</span>
      <span aria-hidden="true">◎</span>
      <select [value]="localization.language()" (change)="changeLanguage($event)">
        @for (option of languages; track option.code) {
          <option [value]="option.code">{{ option.shortLabel }}</option>
        }
      </select>
    </label>
  `,
  styles: `
    .selector {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.5rem;
      padding: 0 0.65rem;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      color: var(--color-muted);
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      font-size: 0.82rem;
      font-weight: 650;
    }
    select {
      cursor: pointer;
      border: 0;
      outline: 0;
      color: inherit;
      background: transparent;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
  readonly localization = inject(LocalizationService);
  readonly languageChanged = output<SupportedLanguage>();
  readonly languages: readonly LanguageOption[] = [
    { code: 'es', label: 'Español', shortLabel: 'ES' },
    { code: 'en', label: 'English', shortLabel: 'EN' },
  ];

  changeLanguage(event: Event): void {
    const language = (event.target as HTMLSelectElement).value as SupportedLanguage;
    if (language === this.localization.language()) return;
    this.localization.setLanguage(language);
    this.languageChanged.emit(language);
  }
}
