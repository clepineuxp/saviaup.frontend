export type DigitalMenuTemplateId = 'bistro' | 'gourmet' | 'showcase' | 'gourmet-hero';
export type DigitalMenuHeaderAlignment = 'left' | 'center' | 'right';
export type DigitalMenuInfoPlacement = 'header' | 'footer';
export type DigitalMenuLogoPlacement = 'none' | 'header' | 'footer' | 'both';

export interface DigitalMenuStyle {
  readonly templateId: DigitalMenuTemplateId;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly selectedButtonTextColor: string;
  readonly fontFamily: string;
  readonly welcomeMessage: string;
  readonly showImages: boolean;
  readonly bannerUrl?: string | null;
  readonly headerAlignment: DigitalMenuHeaderAlignment;
  readonly infoPlacement: DigitalMenuInfoPlacement;
  readonly logoPlacement: DigitalMenuLogoPlacement;
}

export interface PublicProductVariation {
  readonly id: string;
  readonly name: string;
  readonly salePrice: number;
  readonly sortOrder: number;
}

export interface PublicProduct {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly salePrice: number;
  readonly imageRef?: string | null;
  readonly image?: string | null;
  readonly sortOrder: number;
  readonly variations: readonly PublicProductVariation[];
}

export interface PublicCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly imageRef?: string | null;
  readonly image?: string | null;
  readonly sortOrder: number;
  readonly products: readonly PublicProduct[];
}

export interface PublicDigitalMenu {
  readonly tenantId: string;
  readonly organizationName: string;
  readonly hasLogo: boolean;
  readonly logo?: string | null;
  readonly logoVersion: number;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly website?: string | null;
  readonly style: DigitalMenuStyle;
  readonly categories: readonly PublicCategory[];
}

export interface PublicProductImage {
  readonly productId: string;
  readonly image?: string | null;
}

export interface PublicCategoryImages {
  readonly categoryId: string;
  readonly categoryImage?: string | null;
  readonly products: readonly PublicProductImage[];
}
