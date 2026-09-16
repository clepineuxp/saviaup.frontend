import { Observable } from 'rxjs';
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

export abstract class CashRegisterRepository {
  abstract list(includeInactive?: boolean): Observable<readonly CashRegister[]>;
  abstract create(request: CreateCashRegisterRequest): Observable<CashRegister>;
  abstract update(
    cashRegisterId: string,
    request: UpdateCashRegisterRequest,
  ): Observable<CashRegister>;
  abstract setStatus(
    cashRegisterId: string,
    request: SetCashRegisterStatusRequest,
  ): Observable<CashRegister>;
  abstract delete(cashRegisterId: string): Observable<void>;

  abstract openShift(request: OpenCashRegisterShiftRequest): Observable<CashRegisterShift>;
  abstract closeShift(
    shiftId: string,
    request: CloseCashRegisterShiftRequest,
  ): Observable<CashRegisterShift>;
  abstract getShiftSummary(shiftId: string): Observable<CashRegisterShiftSummary>;
  abstract getShiftsPage(
    request: CashRegisterShiftQueryRequest,
  ): Observable<PagedResponse<CashRegisterShift>>;
}
