import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DigitalMenuLayoutComponent } from '../../../layouts/digital-menu-layout/digital-menu-layout.component';
import { PublicDigitalMenu } from '../models/public-digital-menu.model';
import { PublicMenuComponent } from './public-menu.component';

describe('PublicMenuComponent combo details', () => {
  let fixture: ComponentFixture<PublicMenuComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PublicMenuComponent],
      providers: [
        {
          provide: DigitalMenuLayoutComponent,
          useValue: { menu: signal(menuWithCombo()) },
        },
      ],
    });

    fixture = TestBed.createComponent(PublicMenuComponent);
    fixture.detectChanges();
  });

  it('explains every combo group and identifies price adjustments', () => {
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector<HTMLButtonElement>('.product-card');
    card?.click();
    fixture.detectChanges();

    const modalText = element
      .querySelector<HTMLElement>('.product-modal')
      ?.textContent?.replace(/\s+/g, ' ');

    expect(modalText).toContain('Grupo 1 (Fuerte)');
    expect(modalText).toContain('Selección múltiple');
    expect(modalText).toContain('Elige entre 1 y 2 opciones.');
    expect(modalText).toContain('Pollo · Pechuga');
    expect(modalText).toContain('Agrega +$5,000');
    expect(modalText).toContain('Descuenta −$2,000');
    expect(modalText).toContain('Grupo 2 (Bebida)');
    expect(modalText).toContain('Incluido automáticamente en tu combo.');
    expect(modalText).toContain('2 × Limonada');
    expect(modalText).toContain('Sin costo adicional');
  });
});

function menuWithCombo(): PublicDigitalMenu {
  return {
    tenantId: 'tenant-1',
    organizationName: 'Demo',
    hasLogo: false,
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
        name: 'Combos',
        sortOrder: 1,
        products: [
          {
            id: 'combo-1',
            name: 'Almuerzo completo',
            salePrice: 25000,
            sortOrder: 1,
            variations: [],
            comboGroups: [
              {
                id: 'group-1',
                name: 'Fuerte',
                selectionType: 'MULTIPLE',
                isRequired: true,
                minSelections: 1,
                maxSelections: 2,
                order: 1,
                options: [
                  {
                    id: 'option-1',
                    productId: 'product-1',
                    productName: 'Pollo',
                    productQuantity: 1,
                    priceAdjustment: 5000,
                    sortOrder: 1,
                    productVariationId: 'variation-1',
                    productVariationName: 'Pechuga',
                  },
                  {
                    id: 'option-2',
                    productId: 'product-2',
                    productName: 'Pasta',
                    productQuantity: 1,
                    priceAdjustment: -2000,
                    sortOrder: 2,
                  },
                ],
              },
              {
                id: 'group-2',
                name: 'Bebida',
                selectionType: 'FIXED',
                isRequired: true,
                minSelections: 1,
                maxSelections: 1,
                order: 2,
                options: [
                  {
                    id: 'option-3',
                    productId: 'product-3',
                    productName: 'Limonada',
                    productQuantity: 2,
                    priceAdjustment: 0,
                    sortOrder: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
