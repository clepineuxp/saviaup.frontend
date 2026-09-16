import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { ApiClient } from '../../../shared/api/api-client.service';
import { HttpSettingsRepository } from './http-settings.repository';

describe('HttpSettingsRepository', () => {
  const get = vi.fn();
  const getBlob = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const patchRequest = vi.fn();
  const deleteRequest = vi.fn();
  let repository: HttpSettingsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        HttpSettingsRepository,
        {
          provide: ApiClient,
          useValue: { get, getBlob, post, put, patch: patchRequest, delete: deleteRequest },
        },
      ],
    });
    repository = TestBed.inject(HttpSettingsRepository);
  });

  it('uses organization and typed business endpoints', async () => {
    const organization = {
      id: 'tenant-1',
      name: 'Savia',
      hasLogo: false,
      logoVersion: 1,
      canEditDocument: true,
    };
    const business = {
      usesTables: true,
      deliveryEnabled: false,
      requiresOpenCashRegister: false,
      enableCustomSales: false,
      showVoluntaryTip: true,
      tipMessage: 'Servicio Voluntario',
      suggestedTipPercentage: 10,
    };
    get.mockReturnValueOnce(of(organization));
    put.mockReturnValueOnce(of(business));

    await firstValueFrom(repository.getOrganization());
    await firstValueFrom(repository.updateBusiness(business));

    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.settings.organization);
    expect(put).toHaveBeenCalledWith(API_ENDPOINTS.settings.business, business);
  });

  it('uploads the logo as multipart and uses dedicated access endpoints', async () => {
    post.mockReturnValue(of(undefined));
    get.mockReturnValue(of([]));
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    await firstValueFrom(repository.uploadLogo(file));
    await firstValueFrom(repository.listPermissions());
    await firstValueFrom(repository.listUsers());

    const form = post.mock.calls[0][1] as FormData;
    expect(post.mock.calls[0][0]).toBe(API_ENDPOINTS.settings.organizationLogo);
    expect(form.get('file')).toBe(file);
    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.settings.access.permissions);
    expect(get).toHaveBeenCalledWith(API_ENDPOINTS.settings.access.users);
  });
});
