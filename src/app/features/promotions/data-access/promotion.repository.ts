import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Promotion, SavePromotionRequest } from '../models/promotion.model';

export interface PromotionRepository {
  list(includeInactive: boolean): Observable<readonly Promotion[]>;
  create(request: SavePromotionRequest): Observable<Promotion>;
  update(id: string, request: SavePromotionRequest): Observable<Promotion>;
  setStatus(id: string, isActive: boolean): Observable<Promotion>;
  delete(id: string): Observable<void>;
}

export const PROMOTION_REPOSITORY = new InjectionToken<PromotionRepository>('PROMOTION_REPOSITORY');
