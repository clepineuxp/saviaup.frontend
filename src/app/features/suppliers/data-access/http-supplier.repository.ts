import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { Supplier, SupplierLookup } from '../models/supplier.model';
import { mapSupplierDtoToModel, mapSupplierLookupDtoToModel } from './supplier.adapter';
import {
  CreateSupplierPayload,
  SetSupplierStatusPayload,
  SupplierDto,
  SupplierLookupDto,
  SupplierPageDto,
  UpdateSupplierPayload,
} from './supplier.contracts';
import { SupplierPageResult, SupplierRepository } from './supplier.repository';

@Injectable({
  providedIn: 'root',
})
export class HttpSupplierRepository implements SupplierRepository {
  private readonly api = inject(ApiClient);

  getPage(
    search?: string,
    isActive?: boolean,
    page: number = 1,
    pageSize: number = 20
  ): Observable<SupplierPageResult> {
    const queryParams: Record<string, string | number | boolean> = {
      page,
      pageSize,
    };

    if (search && search.trim()) {
      queryParams['search'] = search.trim();
    }
    if (isActive !== undefined && isActive !== null) {
      queryParams['isActive'] = isActive;
    }

    return this.api
      .get<SupplierPageDto>(API_ENDPOINTS.suppliers.root, { params: queryParams })
      .pipe(
        map((dto) => ({
          items: dto.items.map(mapSupplierDtoToModel),
          page: dto.page,
          pageSize: dto.pageSize,
          totalCount: dto.totalCount,
          totalPages: dto.totalPages,
        }))
      );
  }

  getLookup(): Observable<SupplierLookup[]> {
    return this.api
      .get<readonly SupplierLookupDto[]>(API_ENDPOINTS.suppliers.lookup)
      .pipe(map((dtos) => dtos.map(mapSupplierLookupDtoToModel)));
  }

  create(payload: CreateSupplierPayload): Observable<Supplier> {
    return this.api
      .post<SupplierDto, CreateSupplierPayload>(API_ENDPOINTS.suppliers.root, payload)
      .pipe(map(mapSupplierDtoToModel));
  }

  update(supplierId: string, payload: UpdateSupplierPayload): Observable<Supplier> {
    return this.api
      .put<SupplierDto, UpdateSupplierPayload>(
        API_ENDPOINTS.suppliers.detail(supplierId),
        payload
      )
      .pipe(map(mapSupplierDtoToModel));
  }

  setStatus(supplierId: string, isActive: boolean): Observable<Supplier> {
    return this.api
      .patch<SupplierDto, SetSupplierStatusPayload>(
        API_ENDPOINTS.suppliers.status(supplierId),
        { isActive }
      )
      .pipe(map(mapSupplierDtoToModel));
  }
}
