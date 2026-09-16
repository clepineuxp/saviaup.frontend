import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { InventoryItem, InventoryQuery, PagedResponse } from '../models/inventory.model';
import { mapInventoryItem, mapPage } from './inventory.adapter';
import { InventoryItemDto, PagedResponseDto } from './inventory.contracts';
import { compactParams } from './inventory-query-params';
import { StockRepository } from './inventory.repositories';

@Injectable()
export class HttpStockRepository implements StockRepository {
  private readonly api = inject(ApiClient);

  list(query: InventoryQuery): Observable<PagedResponse<InventoryItem>> {
    return this.api
      .get<PagedResponseDto<InventoryItemDto>>(API_ENDPOINTS.inventory.root, {
        params: compactParams(query),
      })
      .pipe(map((page) => mapPage(page, mapInventoryItem)));
  }
}
