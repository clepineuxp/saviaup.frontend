import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/api/api-client.service';
import { PublicDigitalMenu } from '../models/digital-menu.model';

const publicMenuEndpoint = (slug: string): string => `/api/public/menu/${encodeURIComponent(slug)}`;

/** Public, read-only client. It must be used without the admin auth interceptor. */
@Injectable({ providedIn: 'root' })
export class PublicDigitalMenuService {
  private readonly api = inject(ApiClient);

  getPublicMenu(slug: string): Observable<PublicDigitalMenu> {
    return this.api.get<PublicDigitalMenu>(publicMenuEndpoint(slug));
  }
}
