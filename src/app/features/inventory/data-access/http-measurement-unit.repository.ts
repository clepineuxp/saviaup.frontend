import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import {
  CreateMeasurementUnitRequest,
  MeasurementUnit,
  MeasurementUnitQuery,
  PagedResponse,
  SetMeasurementUnitStatusRequest,
  UpdateMeasurementUnitRequest,
} from '../models/inventory.model';
import { mapMeasurementUnit, mapPage } from './inventory.adapter';
import { MeasurementUnitDto, PagedResponseDto } from './inventory.contracts';
import { compactParams } from './inventory-query-params';
import { MeasurementUnitRepository } from './inventory.repositories';

@Injectable()
export class HttpMeasurementUnitRepository implements MeasurementUnitRepository {
  private readonly api = inject(ApiClient);

  list(query: MeasurementUnitQuery): Observable<PagedResponse<MeasurementUnit>> {
    return this.api
      .get<PagedResponseDto<MeasurementUnitDto>>(API_ENDPOINTS.inventory.complements.units, {
        params: compactParams(query),
      })
      .pipe(map((page) => mapPage(page, mapMeasurementUnit)));
  }

  create(request: CreateMeasurementUnitRequest): Observable<MeasurementUnit> {
    return this.api
      .post<MeasurementUnitDto, CreateMeasurementUnitRequest>(
        API_ENDPOINTS.inventory.complements.units,
        request,
      )
      .pipe(map(mapMeasurementUnit));
  }

  update(unitId: string, request: UpdateMeasurementUnitRequest): Observable<MeasurementUnit> {
    return this.api
      .put<MeasurementUnitDto, UpdateMeasurementUnitRequest>(
        API_ENDPOINTS.inventory.complements.unit(unitId),
        request,
      )
      .pipe(map(mapMeasurementUnit));
  }

  setStatus(unitId: string, request: SetMeasurementUnitStatusRequest): Observable<MeasurementUnit> {
    return this.api
      .patch<MeasurementUnitDto, SetMeasurementUnitStatusRequest>(
        API_ENDPOINTS.inventory.complements.unitStatus(unitId),
        request,
      )
      .pipe(map(mapMeasurementUnit));
  }

  delete(unitId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.inventory.complements.unit(unitId));
  }
}
