import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { AppShellState } from '../../../layouts/app-layout/app-shell-state.service';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TableSalesCatalogCache } from '../data-access/table-sales-catalog-cache.service';
import { TableStore } from '../data-access/table-store.service';
import { TableOperationSnapshot } from '../models/table.model';
import { TableOperationPageComponent } from './table-operation-page.component';

const snapshot: TableOperationSnapshot = {
  areas: [],
  metrics: { available: 0, occupied: 0, activeSalesTotal: 0 },
  cashRegister: {
    requiresOpenShift: false,
    hasOpenShift: true,
    isInteractionBlocked: false,
  },
};

describe('TableOperationPageComponent pull refresh', () => {
  const verifyRealtimeConnection = vi.fn(() => of(true));
  const refreshOperation = vi.fn(() => of(snapshot));
  let component: TableOperationPageComponent;

  beforeEach(() => {
    verifyRealtimeConnection.mockClear();
    refreshOperation.mockClear();
    TestBed.configureTestingModule({
      imports: [TableOperationPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: TableStore,
          useValue: {
            cashRegister: signal(snapshot.cashRegister).asReadonly(),
            error: signal(null).asReadonly(),
            metrics: signal(snapshot.metrics).asReadonly(),
            loading: signal(false).asReadonly(),
            operationAreas: signal([]).asReadonly(),
            selectedArea: signal(null).asReadonly(),
            selectedAreaId: signal(null).asReadonly(),
            viewMode: signal('room').asReadonly(),
            canOperate: signal(true).asReadonly(),
            mutating: signal(false).asReadonly(),
            initializeOperation: () => of(snapshot),
            verifyRealtimeConnection,
            refreshOperation,
          },
        },
        {
          provide: TableSalesCatalogCache,
          useValue: {
            syncError: signal(null).asReadonly(),
            validateAndSynchronize: () => of(null),
            retrySynchronization: vi.fn(),
          },
        },
        {
          provide: AppShellState,
          useValue: {
            sidebarHidden: signal(false).asReadonly(),
            toggleSidebar: vi.fn(),
            showSidebar: vi.fn(),
          },
        },
        {
          provide: AuthenticatedContextStore,
          useValue: { hasCashRegistersModule: () => false },
        },
        {
          provide: LocalizationService,
          useValue: {
            language: signal('es').asReadonly(),
            translate: (key: string) => key,
          },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    component = TestBed.createComponent(TableOperationPageComponent).componentInstance;
  });

  it('checks SignalR without reloading the snapshot after a downward pull at the top', () => {
    component.beginPullRefresh(touchEvent(100));
    component.movePullRefresh(touchEvent(250));
    expect(component.pullReady()).toBe(true);

    component.endPullRefresh();

    expect(verifyRealtimeConnection).toHaveBeenCalledOnce();
    expect(refreshOperation).not.toHaveBeenCalled();
    expect(component.pullDistance()).toBe(0);
    expect(component.pullRefreshing()).toBe(false);
  });

  it('does not reload when the pull threshold is not reached', () => {
    component.beginPullRefresh(touchEvent(100));
    component.movePullRefresh(touchEvent(150));
    component.endPullRefresh();

    expect(verifyRealtimeConnection).not.toHaveBeenCalled();
  });

  it('keeps the room zoom while the operation state reloads', () => {
    component.roomZoom.set(1.4);

    component.reloadOperationState();

    expect(component.roomZoom()).toBe(1.4);
    expect(refreshOperation).toHaveBeenCalledOnce();
  });

  it('cancels pull refresh when a second touch starts a pinch gesture', () => {
    component.beginPullRefresh(touchEvent(100));
    component.movePullRefresh(touchEvent(180));
    component.movePullRefresh(multiTouchEvent(180, 220));

    expect(component.pullDistance()).toBe(0);
    component.endPullRefresh();
    expect(verifyRealtimeConnection).not.toHaveBeenCalled();
  });
});

function touchEvent(clientY: number): TouchEvent {
  const target = document.createElement('div');
  return {
    target,
    currentTarget: {
      closest: () => ({ scrollTop: 0 }),
    },
    touches: [{ clientY }],
  } as unknown as TouchEvent;
}

function multiTouchEvent(firstClientY: number, secondClientY: number): TouchEvent {
  return {
    touches: [{ clientY: firstClientY }, { clientY: secondClientY }],
  } as unknown as TouchEvent;
}
