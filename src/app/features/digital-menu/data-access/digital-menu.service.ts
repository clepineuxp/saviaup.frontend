import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  DigitalMenuConfig,
  DigitalMenuStyle,
  PublicDigitalMenu,
  SaveDigitalMenuItemsRequest,
  UpdateDigitalMenuParametersRequest,
} from '../models/digital-menu.model';

@Injectable({ providedIn: 'root' })
export class DigitalMenuService {
  private readonly api = inject(ApiClient);

  getConfig(): Observable<DigitalMenuConfig> {
    return this.api.get<DigitalMenuConfig>(API_ENDPOINTS.digitalMenu.config);
  }

  updateParameters(request: UpdateDigitalMenuParametersRequest): Observable<void> {
    return this.api.put<void, UpdateDigitalMenuParametersRequest>(
      API_ENDPOINTS.digitalMenu.parameters,
      request,
    );
  }

  updateItems(request: SaveDigitalMenuItemsRequest): Observable<void> {
    return this.api.put<void, SaveDigitalMenuItemsRequest>(API_ENDPOINTS.digitalMenu.items, request);
  }

  updateStyle(request: DigitalMenuStyle): Observable<void> {
    return this.api.put<void, DigitalMenuStyle>(API_ENDPOINTS.digitalMenu.style, request);
  }

  getPublicMenu(slug: string): Observable<PublicDigitalMenu> {
    return this.api.get<PublicDigitalMenu>(API_ENDPOINTS.digitalMenu.public(slug));
  }
}
