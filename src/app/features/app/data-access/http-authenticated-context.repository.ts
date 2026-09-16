import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthenticatedContextRepository } from '../../../core/context/authenticated-context.repository';
import {
  AvailableModulesResponse,
  UserInfo,
} from '../../../core/context/authenticated-context.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { SupportedLanguage } from '../../../shared/i18n/translation.types';
import {
  AvailableModulesResponseDto,
  UserInfoDto,
} from '../models/authenticated-context-contracts';
import { mapAvailableModulesResponseDto, mapUserInfoDto } from './authenticated-context.adapter';

@Injectable()
export class HttpAuthenticatedContextRepository implements AuthenticatedContextRepository {
  private readonly api = inject(ApiClient);

  userInfo(): Observable<UserInfo> {
    return this.api.get<UserInfoDto>(API_ENDPOINTS.users.info).pipe(map(mapUserInfoDto));
  }

  availableModules(language: SupportedLanguage): Observable<AvailableModulesResponse> {
    return this.api
      .get<AvailableModulesResponseDto>(API_ENDPOINTS.modules.available, {
        headers: { 'Accept-Language': language },
      })
      .pipe(map(mapAvailableModulesResponseDto));
  }
}
