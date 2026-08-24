import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PagedResponse } from '../../../shared/models/paged-response.model';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { HttpSettingsRepository } from '../../settings/data-access/http-settings.repository';
import { SETTINGS_REPOSITORY } from '../../settings/data-access/settings.repository';
import { PaymentMethod } from '../../settings/models/settings.model';
import { CashRegisterStore } from '../data-access/cash-register-store.service';
import { CashRegisterRepository } from '../data-access/cash-register.repository';
import { HttpCashRegisterRepository } from '../data-access/http-cash-register.repository';
import {
  CashRegister,
  CashRegisterShift,
  CashRegisterShiftSummary,
  ClosingBalanceInput,
  OpeningBalanceInput,
} from '../models/cash-register.model';

import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-cash-register-page',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    TranslatePipe,
    UiAlertComponent,
    UiButtonComponent,
  ],
  templateUrl: './cash-register-page.component.html',
  styleUrl: './cash-register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterPageComponent implements OnInit {
  readonly store = inject(CashRegisterStore);
  private readonly settingsRepo =
    inject(SETTINGS_REPOSITORY, { optional: true }) ?? inject(HttpSettingsRepository);
  private readonly repository =
    inject(CashRegisterRepository, { optional: true }) ?? inject(HttpCashRegisterRepository);

  readonly allPaymentMethods = signal<readonly PaymentMethod[]>([]);

  // Shift Management Signals
  readonly shiftsPage = signal<PagedResponse<CashRegisterShift> | null>(null);
  readonly loadingShifts = signal<boolean>(false);

  // Open Shift Modal State
  readonly openShiftModalRegister = signal<CashRegister | null>(null);
  readonly openingBalancesMap = signal<Record<string, number>>({});
  readonly openingMethodsList = signal<readonly PaymentMethod[]>([]);

  // Close Shift Modal State (6.1 & 6.2)
  readonly closingShiftState = signal<{
    shiftId: string;
    summary: CashRegisterShiftSummary;
    actualAmounts: Record<string, number>;
    isReadOnly: boolean;
  } | null>(null);

  readonly submittingShift = signal<boolean>(false);
  readonly shiftErrorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.store.load(true).subscribe();
    this.settingsRepo.listPaymentMethods().subscribe({
      next: (methods) => this.allPaymentMethods.set(methods),
      error: () => this.allPaymentMethods.set([]),
    });
    this.loadShiftsPage(1);
  }

  loadShiftsPage(page = 1): void {
    this.loadingShifts.set(true);
    this.repository.getShiftsPage({ page, pageSize: 15 }).subscribe({
      next: (res) => {
        this.shiftsPage.set(res);
        this.loadingShifts.set(false);
      },
      error: () => {
        this.loadingShifts.set(false);
      },
    });
  }

  // --- OPEN SHIFT LOGIC ---
  openOpenShiftModal(register: CashRegister): void {
    const methods = this.allPaymentMethods().filter(
      (pm) => pm.isActive && pm.isIncludedInCashOpening,
    );

    this.openingMethodsList.set(methods);
    const initialMap: Record<string, number> = {};
    methods.forEach((m) => {
      initialMap[m.name] = 0;
    });

    this.openingBalancesMap.set(initialMap);
    this.openShiftModalRegister.set(register);
    this.shiftErrorMessage.set(null);
  }

  closeOpenShiftModal(): void {
    this.openShiftModalRegister.set(null);
    this.shiftErrorMessage.set(null);
  }

  updateOpeningBalance(methodName: string, val: number): void {
    this.openingBalancesMap.update((map) => ({
      ...map,
      [methodName]: Math.max(0, val || 0),
    }));
  }

  confirmOpenShift(): void {
    const register = this.openShiftModalRegister();
    if (!register) return;

    this.submittingShift.set(true);
    this.shiftErrorMessage.set(null);

    const initialBalances: OpeningBalanceInput[] = Object.entries(this.openingBalancesMap()).map(
      ([methodName, amount]) => ({ methodName, amount }),
    );

    this.repository
      .openShift({
        cashRegisterId: register.id,
        initialBalances,
      })
      .subscribe({
        next: () => {
          this.submittingShift.set(false);
          this.closeOpenShiftModal();
          this.store.load(true).subscribe();
          this.loadShiftsPage(1);
        },
        error: (err: { message?: string }) => {
          this.submittingShift.set(false);
          this.shiftErrorMessage.set(
            err?.message || 'No se pudo realizar la apertura de la caja.',
          );
        },
      });
  }

  // --- CLOSE SHIFT LOGIC (6.1 & 6.2) ---
  openCloseShiftModal(shiftId: string, isReadOnly = false): void {
    this.submittingShift.set(true);
    this.shiftErrorMessage.set(null);

    this.repository.getShiftSummary(shiftId).subscribe({
      next: (summary) => {
        this.submittingShift.set(false);
        const actualAmounts: Record<string, number> = {};
        summary.methodSummaries.forEach((m) => {
          actualAmounts[m.methodName] = isReadOnly
            ? (m.actualAmount ?? m.expectedTotalAmount)
            : m.expectedTotalAmount;
        });

        this.closingShiftState.set({
          shiftId,
          summary,
          actualAmounts,
          isReadOnly,
        });
      },
      error: (err: { message?: string }) => {
        this.submittingShift.set(false);
        alert(err?.message || 'No se pudo obtener el resumen para cerrar la caja.');
      },
    });
  }

  closeCloseShiftModal(): void {
    this.closingShiftState.set(null);
    this.shiftErrorMessage.set(null);
  }

  updateClosingActualAmount(methodName: string, val: number): void {
    const state = this.closingShiftState();
    if (!state || state.isReadOnly) return;

    this.closingShiftState.set({
      ...state,
      actualAmounts: {
        ...state.actualAmounts,
        [methodName]: Math.max(0, val || 0),
      },
    });
  }

  getCalculatedDifference(methodName: string, expected: number): number {
    const state = this.closingShiftState();
    if (!state) return 0;
    const actual = state.actualAmounts[methodName] ?? expected;
    return actual - expected;
  }

  confirmCloseShift(): void {
    const state = this.closingShiftState();
    if (!state || state.isReadOnly) return;

    this.submittingShift.set(true);
    this.shiftErrorMessage.set(null);

    const closingBalances: ClosingBalanceInput[] = Object.entries(state.actualAmounts).map(
      ([methodName, actualAmount]) => ({ methodName, actualAmount }),
    );

    this.repository
      .closeShift(state.shiftId, { closingBalances })
      .subscribe({
        next: () => {
          this.submittingShift.set(false);
          this.closeCloseShiftModal();
          this.store.load(true).subscribe();
          const currentPage = this.shiftsPage()?.pageNumber ?? 1;
          this.loadShiftsPage(currentPage);
        },
        error: (err: { message?: string }) => {
          this.submittingShift.set(false);
          this.shiftErrorMessage.set(
            err?.message ||
              'No se puede cerrar la caja porque existen mesas ocupadas o comandas pendientes por cobrar.',
          );
        },
      });
  }
}
