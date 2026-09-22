import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_ENVIRONMENT } from '../../../../src/app/core/config/app-environment';
import { PublicDigitalMenuService } from '../../../../src/app/features/digital-menu/data-access/public-digital-menu.service';

describe('PublicDigitalMenuService in the public app', () => {
  let http: HttpTestingController;
  let service: PublicDigitalMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_ENVIRONMENT,
          useValue: {
            production: false,
            useMockApi: false,
            apiUrl: 'https://public-api.test',
            signalRUrl: 'https://public-api.test/hubs',
            menuFrontendUrl: 'https://menu.test',
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PublicDigitalMenuService);
  });

  afterEach(() => http.verify());

  it('requests the anonymous endpoint without auth or tenant headers', () => {
    service.getPublicMenu('café central').subscribe();

    const request = http.expectOne('https://public-api.test/api/public/menu/caf%C3%A9%20central');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.headers.has('X-Tenant-Id')).toBe(false);
    request.flush({});
  });

  it('resolves lightweight API image paths against the configured API host', async () => {
    const response = firstValueFrom(service.getPublicMenu('demo'));
    const request = http.expectOne('https://public-api.test/api/public/menu/demo');
    request.flush({
      tenantId: 'tenant-1',
      organizationName: 'Demo',
      hasLogo: true,
      logo: '/api/public/menu/demo/logo?v=1',
      logoVersion: 1,
      style: {},
      categories: [
        {
          id: 'category-1',
          name: 'Platos',
          sortOrder: 1,
          image: '/api/public/menu/demo/images/category-image',
          products: [
            {
              id: 'product-1',
              name: 'Especial',
              salePrice: 15000,
              sortOrder: 1,
              image: '/api/public/menu/demo/images/product-image',
              variations: [],
            },
          ],
        },
      ],
    });

    await expect(response).resolves.toMatchObject({
      logo: 'https://public-api.test/api/public/menu/demo/logo?v=1',
      categories: [
        {
          image: 'https://public-api.test/api/public/menu/demo/images/category-image',
          products: [
            {
              image: 'https://public-api.test/api/public/menu/demo/images/product-image',
            },
          ],
        },
      ],
    });
  });

  it.each([
    { status: 401, statusText: 'Unauthorized', kind: 'unauthenticated' },
    { status: 403, statusText: 'Forbidden', kind: 'unauthorized' },
  ])('surfaces $status as a resource error without attempting refresh', async (scenario) => {
    const response = firstValueFrom(service.getPublicMenu('demo'));
    const request = http.expectOne('https://public-api.test/api/public/menu/demo');
    request.flush(
      { error: { code: 'AUTH_UNAUTHENTICATED', message: 'No disponible' } },
      { status: scenario.status, statusText: scenario.statusText },
    );

    await expect(response).rejects.toMatchObject({
      kind: scenario.kind,
      status: scenario.status,
    });
    http.expectNone('https://public-api.test/api/auth/refresh');
  });
});
