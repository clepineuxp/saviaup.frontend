import { Observable } from 'rxjs';
import {
  CashRegister,
  CreateCashRegisterRequest,
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
}
