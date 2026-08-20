import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { LOCAL_TRANSLATIONS } from './local-translations';
import { TRANSLATION_REPOSITORY } from './translation.repository';
import { SupportedLanguage, TranslationDictionary } from './translation.types';

const LANGUAGE_KEY = 'saviaup.language';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private readonly repository = inject(TRANSLATION_REPOSITORY);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly languageState = signal<SupportedLanguage>(this.readLanguage());
  private readonly translationsState = signal<TranslationDictionary>(
    LOCAL_TRANSLATIONS[this.languageState()],
  );

  readonly language = this.languageState.asReadonly();

  initialize(): void {
    this.load(this.languageState());
  }

  setLanguage(language: SupportedLanguage): void {
    if (language === this.languageState()) return;
    this.languageState.set(language);
    if (this.isBrowser) localStorage.setItem(LANGUAGE_KEY, language);
    this.load(language);
  }

  translate(key: string, variables: Readonly<Record<string, string | number>> = {}): string {
    const template =
      this.translationsState()[key] ?? LOCAL_TRANSLATIONS[this.languageState()][key] ?? key;
    return Object.entries(variables).reduce(
      (message, [name, value]) => message.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  }

  private load(language: SupportedLanguage): void {
    this.document.documentElement.lang = language;
    this.translationsState.set(LOCAL_TRANSLATIONS[language]);
    this.repository
      .load(language)
      .pipe(catchError(() => of(LOCAL_TRANSLATIONS[language])))
      .subscribe((translations) =>
        this.translationsState.set({ ...LOCAL_TRANSLATIONS[language], ...translations }),
      );
  }

  private readLanguage(): SupportedLanguage {
    if (!this.isBrowser) return 'es';
    return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'es';
  }
}
