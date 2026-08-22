import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { PagedResponse } from '../../../shared/models/paged-response.model';
import {
  CashRegister,
  CashRegisterShift,
  CashRegisterShiftQueryRequest,
  CashRegisterShiftSummary,
  CloseCashRegisterShiftRequest,
  CreateCashRegisterRequest,
  OpenCashRegisterShiftRequest,
  SetCashRegisterStatusRequest,
  UpdateCashRegisterRequest,
} from '../models/cash-register.model';
import { CashRegisterRepository } from './cash-register.repository';

@Injectable({
  providedIn: 'root',
})
export class HttpCashRegisterRepository implements CashRegisterRepository {
  private readonly api = inject(ApiClient);

  list(includeInactive = false): Observable<readonly CashRegister[]> {
    return this.api.get<readonly CashRegister[]>(API_ENDPOINTS.cashRegisters.root, {
      params: { includeInactive },
    });
  }

  create(request: CreateCashRegisterRequest): Observable<CashRegister> {
    return this.api.post<CashRegister, CreateCashRegisterRequest>(
      API_ENDPOINTS.cashRegisters.root,
      request,
    );
  }

  update(cashRegisterId: string, request: UpdateCashRegisterRequest): Observable<CashRegister> {
    return this.api.put<CashRegister, UpdateCashRegisterRequest>(
      API_ENDPOINTS.cashRegisters.detail(cashRegisterId),
      request,
    );
  }

  setStatus(
    cashRegisterId: string,
    request: SetCashRegisterStatusRequest,
  ): Observable<CashRegister> {
    return this.api.patch<CashRegister, SetCashRegisterStatusRequest>(
      API_ENDPOINTS.cashRegisters.status(cashRegisterId),
      request,
    );
  }

  delete(cashRegisterId: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.cashRegisters.detail(cashRegisterId));
  }

  openShift(request: OpenCashRegisterShiftRequest): Observable<CashRegisterShift> {
    return this.api.post<CashRegisterShift, OpenCashRegisterShiftRequest>(
      API_ENDPOINTS.cashRegisters.openShift,
      request,
    );
  }

  closeShift(
    shiftId: string,
    request: CloseCashRegisterShiftRequest,
  ): Observable<CashRegisterShift> {
    return this.api.post<CashRegisterShift, CloseCashRegisterShiftRequest>(
      API_ENDPOINTS.cashRegisters.closeShift(shiftId),
      request,
    );
  }

  getShiftSummary(shiftId: string): Observable<CashRegisterShiftSummary> {
    return this.api.get<CashRegisterShiftSummary>(
      API_ENDPOINTS.cashRegisters.shiftSummary(shiftId),
    );
  }

  getShiftsPage(
    request: CashRegisterShiftQueryRequest,
  ): Observable<PagedResponse<CashRegisterShift>> {
    const params: Record<string, string | number | boolean> = {};
    if (request.page) params['page'] = request.page;
    if (request.pageSize) params['pageSize'] = request.pageSize;
    if (request.cashRegisterId) params['cashRegisterId'] = request.cashRegisterId;
    if (request.status) params['status'] = request.status;

    return this.api.get<PagedResponse<CashRegisterShift>>(
      API_ENDPOINTS.cashRegisters.shiftsPage,
      { params },
    );
  }
}
