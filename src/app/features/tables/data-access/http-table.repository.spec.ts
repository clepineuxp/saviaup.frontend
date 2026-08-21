import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { HttpTableRepository } from './http-table.repository';

describe('HttpTableRepository', () => {
  const api = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  let repository: HttpTableRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [HttpTableRepository, { provide: ApiClient, useValue: api }],
    });
    repository = TestBed.inject(HttpTableRepository);
  });

  it('loads the operation snapshot from the dedicated endpoint', () => {
    const snapshot = {
      areas: [],
      metrics: { available: 0, occupied: 0, activeSalesTotal: 0 },
      cashRegister: {
        requiresOpenShift: false,
        hasOpenShift: true,
        isInteractionBlocked: false,
      },
    };
    api.get.mockReturnValue(of(snapshot));

    repository.operationSnapshot().subscribe((result) => expect(result).toEqual(snapshot));

    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.tables.operation);
  });

  it('sends the complete area order to the reorder endpoint', () => {
    api.put.mockReturnValue(of([]));

    repository.reorderAreas(['area-2', 'area-1']).subscribe();

    expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.tables.areas.reorder, {
      areaIds: ['area-2', 'area-1'],
    });
  });
});
