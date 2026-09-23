import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PUBLIC_MENU_ENVIRONMENT } from '../../../core/config/public-menu-environment';
import { PublicCategoryImages, PublicDigitalMenu } from '../models/public-digital-menu.model';

const publicMenuEndpoint = (slug: string): string => `/api/public/menu/${encodeURIComponent(slug)}`;
const publicCategoryImagesEndpoint = (slug: string, categoryId: string): string =>
  `${publicMenuEndpoint(slug)}/categories/${encodeURIComponent(categoryId)}/images`;

/** Public, read-only client. It must be used without the admin auth interceptor. */
@Injectable({ providedIn: 'root' })
export class PublicDigitalMenuService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(PUBLIC_MENU_ENVIRONMENT);

  getPublicMenu(slug: string): Observable<PublicDigitalMenu> {
    return this.get<PublicDigitalMenu>(publicMenuEndpoint(slug));
  }

  getCategoryImages(slug: string, categoryId: string): Observable<PublicCategoryImages> {
    return this.get<PublicCategoryImages>(publicCategoryImagesEndpoint(slug, categoryId));
  }

  private get<T>(path: string): Observable<T> {
    const apiUrl = this.environment.apiUrl.replace(/\/$/, '');
    return this.http.get<T>(`${apiUrl}/${path.replace(/^\//, '')}`);
  }
}
