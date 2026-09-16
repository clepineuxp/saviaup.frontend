import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CreateInventoryMovementRequest,
  InventoryMovement,
  InventoryMovementQuery,
  PagedResponse,
} from '../models/inventory.model';
import { mapInventoryMovement, mapPage } from './inventory.adapter';
import { InventoryMovementDto, PagedResponseDto } from './inventory.contracts';
import { compactParams } from './inventory-query-params';
import { MovementRepository } from './inventory.repositories';

@Injectable()
export class HttpMovementRepository implements MovementRepository {
  private readonly api = inject(ApiClient);

  list(query: InventoryMovementQuery): Observable<PagedResponse<InventoryMovement>> {
    return this.api
      .get<PagedResponseDto<InventoryMovementDto>>(API_ENDPOINTS.inventory.movements, {
        params: compactParams(query),
      })
      .pipe(map((page) => mapPage(page, mapInventoryMovement)));
  }

  create(request: CreateInventoryMovementRequest): Observable<InventoryMovement> {
    return this.api
      .post<InventoryMovementDto, CreateInventoryMovementRequest>(
        API_ENDPOINTS.inventory.movements,
        request,
      )
      .pipe(map(mapInventoryMovement));
  }
}
