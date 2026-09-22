import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { PublicDigitalMenuService } from '../../../../src/app/features/digital-menu/data-access/public-digital-menu.service';
import {
  PublicCategoryImages,
  PublicDigitalMenu,
} from '../../../../src/app/features/digital-menu/models/digital-menu.model';
import { DigitalMenuLayoutComponent } from '../../../../src/app/layouts/digital-menu-layout/digital-menu-layout.component';

describe('DigitalMenuLayoutComponent progressive images', () => {
  it('loads category image batches sequentially and updates the visible menu', () => {
    const firstImages = new Subject<PublicCategoryImages>();
    const secondImages = new Subject<PublicCategoryImages>();
    const menu = createMenu();
    const service = {
      getPublicMenu: vi.fn(() => of(menu)),
      getCategoryImages: vi.fn((_slug: string, categoryId: string) =>
        categoryId === 'category-1' ? firstImages : secondImages,
      ),
    };

    TestBed.configureTestingModule({
      imports: [DigitalMenuLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'demo' })) },
        },
        { provide: PublicDigitalMenuService, useValue: service },
      ],
    });

    const fixture = TestBed.createComponent(DigitalMenuLayoutComponent);
    fixture.detectChanges();

    expect(service.getCategoryImages).toHaveBeenCalledTimes(1);
    expect(service.getCategoryImages).toHaveBeenLastCalledWith('demo', 'category-1');

    firstImages.next({
      categoryId: 'category-1',
      categoryImage: null,
      products: [{ productId: 'product-1', image: 'data:image/webp;base64,FIRST' }],
    });
    expect(fixture.componentInstance.menu()?.categories[0].products[0].image).toBe(
      'data:image/webp;base64,FIRST',
    );
    expect(service.getCategoryImages).toHaveBeenCalledTimes(1);

    firstImages.complete();
    expect(service.getCategoryImages).toHaveBeenCalledTimes(2);
    expect(service.getCategoryImages).toHaveBeenLastCalledWith('demo', 'category-2');

    fixture.destroy();
  });
});

function createMenu(): PublicDigitalMenu {
  return {
    tenantId: 'tenant-1',
    organizationName: 'Demo',
    hasLogo: false,
    logo: null,
    logoVersion: 1,
    style: {
      templateId: 'bistro',
      primaryColor: '#10b981',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      selectedButtonTextColor: '#ffffff',
      fontFamily: 'Inter',
      welcomeMessage: 'Bienvenidos',
      showImages: true,
      headerAlignment: 'left',
      infoPlacement: 'header',
      logoPlacement: 'header',
    },
    categories: [
      {
        id: 'category-1',
        name: 'Entradas',
        sortOrder: 1,
        products: [
          {
            id: 'product-1',
            name: 'Entrada',
            salePrice: 10000,
            sortOrder: 1,
            variations: [],
          },
        ],
      },
      {
        id: 'category-2',
        name: 'Platos fuertes',
        sortOrder: 2,
        products: [],
      },
    ],
  };
}
