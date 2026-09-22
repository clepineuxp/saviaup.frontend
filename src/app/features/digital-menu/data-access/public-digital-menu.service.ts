import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../../core/config/app-environment';
import { ApiClient } from '../../../shared/api/api-client.service';
import { PublicDigitalMenu } from '../models/digital-menu.model';

const publicMenuEndpoint = (slug: string): string => `/api/public/menu/${encodeURIComponent(slug)}`;

/** Public, read-only client. It must be used without the admin auth interceptor. */
@Injectable({ providedIn: 'root' })
export class PublicDigitalMenuService {
  private readonly api = inject(ApiClient);
  private readonly environment = inject(APP_ENVIRONMENT);

  getPublicMenu(slug: string): Observable<PublicDigitalMenu> {
    return this.api
      .get<PublicDigitalMenu>(publicMenuEndpoint(slug))
      .pipe(map((menu) => this.resolveAssetUrls(menu)));
  }

  private resolveAssetUrls(menu: PublicDigitalMenu): PublicDigitalMenu {
    return {
      ...menu,
      logo: this.resolveAssetUrl(menu.logo),
      categories: (menu.categories ?? []).map((category) => ({
        ...category,
        image: this.resolveAssetUrl(category.image),
        products: category.products.map((product) => ({
          ...product,
          image: this.resolveAssetUrl(product.image),
        })),
      })),
    };
  }

  private resolveAssetUrl(url: string | null | undefined): string | null | undefined {
    if (!url?.startsWith('/')) return url;
    return `${this.environment.apiUrl.replace(/\/$/, '')}${url}`;
  }
}
