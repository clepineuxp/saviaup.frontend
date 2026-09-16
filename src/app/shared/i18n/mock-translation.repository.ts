import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { LOCAL_TRANSLATIONS } from './local-translations';
import { TranslationRepository } from './translation.repository';
import { SupportedLanguage, TranslationDictionary } from './translation.types';

@Injectable()
export class MockTranslationRepository implements TranslationRepository {
  load(language: SupportedLanguage): Observable<TranslationDictionary> {
    return of(LOCAL_TRANSLATIONS[language]).pipe(delay(80));
  }
}
