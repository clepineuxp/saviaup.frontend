import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';
import { ApiClient } from '../api/api-client.service';
import { TranslationRepository } from './translation.repository';
import { SupportedLanguage, TranslationDictionary } from './translation.types';

@Injectable()
export class HttpTranslationRepository implements TranslationRepository {
  private readonly api = inject(ApiClient);

  load(language: SupportedLanguage): Observable<TranslationDictionary> {
    return this.api.get<TranslationDictionary>(API_ENDPOINTS.i18n.language(language));
  }
}
