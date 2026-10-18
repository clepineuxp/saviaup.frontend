import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { Promotion, SavePromotionRequest } from '../models/promotion.model';
import { mapPromotion } from './promotion.adapter';
import { PromotionDto, SavePromotionDto } from './promotion.contracts';
import { PromotionRepository } from './promotion.repository';

@Injectable()
export class HttpPromotionRepository implements PromotionRepository {
  private readonly api = inject(ApiClient);

  list(includeInactive: boolean): Observable<readonly Promotion[]> {
    return this.api
      .get<readonly PromotionDto[]>(API_ENDPOINTS.promotions.root, { params: { includeInactive } })
      .pipe(map((items) => items.map(mapPromotion)));
  }

  create(request: SavePromotionRequest): Observable<Promotion> {
    return this.api
      .post<PromotionDto, SavePromotionDto>(API_ENDPOINTS.promotions.root, request)
      .pipe(map(mapPromotion));
  }

  update(id: string, request: SavePromotionRequest): Observable<Promotion> {
    return this.api
      .put<PromotionDto, SavePromotionDto>(API_ENDPOINTS.promotions.detail(id), request)
      .pipe(map(mapPromotion));
  }

  setStatus(id: string, isActive: boolean): Observable<Promotion> {
    return this.api
      .patch<PromotionDto, { isActive: boolean }>(API_ENDPOINTS.promotions.status(id), { isActive })
      .pipe(map(mapPromotion));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.promotions.detail(id));
  }
}
