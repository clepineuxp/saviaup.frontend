import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import {
  CashRegister,
  CreateCashRegisterRequest,
  SetCashRegisterStatusRequest,
  UpdateCashRegisterRequest,
} from '../models/cash-register.model';
import { CashRegisterRepository } from './cash-register.repository';
import { HttpCashRegisterRepository } from './http-cash-register.repository';

@Injectable({
  providedIn: 'root',
})
export class CashRegisterStore {
  private readonly repository =
    inject(CashRegisterRepository, {
      optional: true,
    }) ?? inject(HttpCashRegisterRepository);
  private readonly auth = inject(AuthStore);

  private readonly cashRegistersSignal = signal<readonly CashRegister[]>([]);
  private readonly statusSignal = signal<RequestStatus>('idle');
  private readonly errorSignal = signal<string | null>(null);
  private readonly isSavingSignal = signal(false);

  readonly cashRegisters = this.cashRegistersSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isSaving = this.isSavingSignal.asReadonly();

  readonly activeCashRegister = computed(
    () => this.cashRegistersSignal().find((cr) => cr.isActive) ?? null,
  );
  readonly inactiveCashRegisters = computed(() =>
    this.cashRegistersSignal().filter((cr) => !cr.isActive),
  );
  readonly hasActiveCashRegister = computed(() => this.activeCashRegister() !== null);
  readonly canManage = computed(() =>
    Boolean(this.auth.user()?.permissions.includes('cash-registers.manage')),
  );

  load(includeInactive = true): Observable<readonly CashRegister[]> {
    this.statusSignal.set('loading');
    this.errorSignal.set(null);

    return this.repository.list(includeInactive).pipe(
      tap((registers) => {
        this.cashRegistersSignal.set(registers);
        this.statusSignal.set('success');
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(this.getErrorMessage(error));
        this.statusSignal.set('error');
        return of([]);
      }),
    );
  }

  create(request: CreateCashRegisterRequest): Observable<CashRegister | null> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);

    return this.repository.create(request).pipe(
      tap((created) => {
        this.cashRegistersSignal.update((current) => {
          const updatedCurrent = created.isActive
            ? current.map((item) => ({ ...item, isActive: false }))
            : current;
          return [...updatedCurrent, created];
        });
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(this.getErrorMessage(error));
        return of(null);
      }),
      finalize(() => this.isSavingSignal.set(false)),
    );
  }

  update(
    cashRegisterId: string,
    request: UpdateCashRegisterRequest,
  ): Observable<CashRegister | null> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);

    return this.repository.update(cashRegisterId, request).pipe(
      tap((updated) => {
        this.cashRegistersSignal.update((current) =>
          current.map((item) => {
            if (item.id === cashRegisterId) {
              return updated;
            }
            if (updated.isActive) {
              return { ...item, isActive: false };
            }
            return item;
          }),
        );
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(this.getErrorMessage(error));
        return of(null);
      }),
      finalize(() => this.isSavingSignal.set(false)),
    );
  }

  setStatus(cashRegisterId: string, isActive: boolean): Observable<CashRegister | null> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);
    const payload: SetCashRegisterStatusRequest = { isActive };

    return this.repository.setStatus(cashRegisterId, payload).pipe(
      tap((updated) => {
        this.cashRegistersSignal.update((current) =>
          current.map((item) => {
            if (item.id === cashRegisterId) {
              return updated;
            }
            if (updated.isActive) {
              return { ...item, isActive: false };
            }
            return item;
          }),
        );
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(this.getErrorMessage(error));
        return of(null);
      }),
      finalize(() => this.isSavingSignal.set(false)),
    );
  }

  delete(cashRegisterId: string): Observable<boolean> {
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);

    return this.repository.delete(cashRegisterId).pipe(
      map(() => true),
      tap(() => {
        this.cashRegistersSignal.update((current) =>
          current.filter((item) => item.id !== cashRegisterId),
        );
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(this.getErrorMessage(error));
        return of(false);
      }),
      finalize(() => this.isSavingSignal.set(false)),
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    return 'No pudimos completar la operación en la caja.';
  }
}
