import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, take } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { DiscoveredPrintAgent } from '../models/printing.model';
import { PrintingRepository, PRINTING_REPOSITORY } from './printing.repository';
import { PrintingStore } from './printing-store.service';

describe('PrintingStore active discovery', () => {
  const discovered: DiscoveredPrintAgent = {
    discoveryId: 'discovery-1',
    deviceIdentifier: 'device-1',
    hostname: 'POS-01',
    operatingSystem: 'Windows 11',
    version: '1.0.0',
    localIpAddress: '192.168.1.8',
    connectedAt: '2026-09-23T20:00:00Z',
    isReactivation: false,
  };
  const discoveredAgents = vi.fn(() => of([discovered]));
  let store: PrintingStore;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        PrintingStore,
        {
          provide: AuthStore,
          useValue: {
            loadCurrentUser: () =>
              of({
                id: 'user-1',
                firstName: 'Ana',
                lastName: 'Savia',
                email: 'ana@savia.test',
                permissions: ['printing.agents.manage'],
              }),
          },
        },
        {
          provide: PRINTING_REPOSITORY,
          useValue: { discoveredAgents } satisfies Partial<PrintingRepository>,
        },
      ],
    });
    store = TestBed.inject(PrintingStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('refreshes pending agents periodically when the user can manage them', async () => {
    await firstValueFrom(store.ensurePermissions());
    const firstRefresh = firstValueFrom(store.watchDiscoveredAgents(3000).pipe(take(1)));

    await vi.advanceTimersByTimeAsync(3000);
    const result = await firstRefresh;

    expect(discoveredAgents).toHaveBeenCalledTimes(1);
    expect(result).toEqual([discovered]);
    expect(store.discoveredAgents()).toEqual([discovered]);
    expect(store.mutating()).toBe(false);
  });
});
