import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SupportedLanguage, TranslationDictionary } from './translation.types';

export interface TranslationRepository {
  load(language: SupportedLanguage): Observable<TranslationDictionary>;
}

export const TRANSLATION_REPOSITORY = new InjectionToken<TranslationRepository>(
  'TRANSLATION_REPOSITORY',
);
