import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { DEFAULT_PRINT_JOB_QUERY, SavePrinterRequest } from '../models/printing.model';
import { HttpPrintingRepository } from './http-printing.repository';

describe('HttpPrintingRepository', () => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const deleteRequest = vi.fn();
  let repository: HttpPrintingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        HttpPrintingRepository,
        { provide: ApiClient, useValue: { get, post, put, delete: deleteRequest } },
      ],
    });
    repository = TestBed.inject(HttpPrintingRepository);
  });

  it('uses scoped printing lookups and never sends a tenant identifier', async () => {
    get.mockReturnValue(of({ items: [], page: 2, pageSize: 25, totalCount: 0, totalPages: 0 }));
    await firstValueFrom(
      repository.jobs({
        ...DEFAULT_PRINT_JOB_QUERY,
        page: 2,
        search: 'CMD-42',
        status: 'FAILED',
      }),
    );

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.printing.jobs, {
      params: { page: 2, pageSize: 25, search: 'CMD-42', status: 'FAILED' },
    });
    expect(JSON.stringify(get.mock.calls)).not.toContain('tenantId');
  });

  it('uses dedicated printer, queue actions, and test endpoints', async () => {
    const request: SavePrinterRequest = {
      printAgentId: 'agent-1',
      name: 'Cocina',
      connectionType: 'WINDOWS_SPOOLER',
      localPrinterName: 'EPSON Cocina',
      ipAddress: null,
      port: null,
      paperWidth: 80,
      enabled: true,
    };
    const response = { id: 'printer-1', ...request };
    post.mockReturnValue(of(response));
    put.mockReturnValue(of(response));

    await firstValueFrom(repository.createPrinter(request));
    await firstValueFrom(repository.updatePrinter('printer-1', request));
    await firstValueFrom(repository.testPrint('agent-1', 'printer-1'));
    await firstValueFrom(repository.cancelJob('job-1'));
    await firstValueFrom(repository.retryJob('job-1'));
    await firstValueFrom(repository.reprintJob('job-1'));

    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.printing.agentPrinters('agent-1'), request);
    expect(put).toHaveBeenCalledWith(API_ENDPOINTS.printing.printer('printer-1'), request);
    expect(post).toHaveBeenCalledWith(
      API_ENDPOINTS.printing.testPrint('agent-1'),
      {},
      { params: { printerId: 'printer-1' } },
    );
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.printing.cancelJob('job-1'), {});
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.printing.retryJob('job-1'), {});
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.printing.reprintJob('job-1'), {});
  });

  it('requests discovery and reads the Windows printers reported by an agent', async () => {
    get.mockReturnValue(of([]));
    post.mockReturnValue(of(undefined));

    await firstValueFrom(repository.requestPrinterDiscovery('agent-1'));
    await firstValueFrom(repository.availablePrinters('agent-1'));

    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.printing.discoverPrinters('agent-1'), {});
    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.printing.availablePrinters('agent-1'));
  });
});
