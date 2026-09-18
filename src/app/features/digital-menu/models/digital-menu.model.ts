export type DigitalMenuTemplateId = 'bistro' | 'gourmet' | 'showcase' | 'gourmet-hero';
export type DigitalMenuHeaderAlignment = 'left' | 'center' | 'right';
export type DigitalMenuInfoPlacement = 'header' | 'footer';
export type DigitalMenuLogoPlacement = 'none' | 'header' | 'footer' | 'both';

export interface DigitalMenuStyle {
  templateId: DigitalMenuTemplateId;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  selectedButtonTextColor: string;
  fontFamily: string;
  welcomeMessage: string;
  showImages: boolean;
  bannerUrl?: string | null;
  headerAlignment: DigitalMenuHeaderAlignment;
  infoPlacement: DigitalMenuInfoPlacement;
  logoPlacement: DigitalMenuLogoPlacement;
}

export interface DigitalMenuItemSummary {
  id?: string | null;
  itemType: 'CATEGORY' | 'PRODUCT';
  targetId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  imageRef?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface DigitalMenuConfig {
  enabled: boolean;
  slug?: string | null;
  canEditSlug: boolean;
  style: DigitalMenuStyle;
  categories: readonly DigitalMenuItemSummary[];
  products: readonly DigitalMenuItemSummary[];
}

export interface SaveDigitalMenuItemInput {
  itemType: string;
  targetId: string;
  categoryId?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SaveDigitalMenuItemsRequest {
  items: readonly SaveDigitalMenuItemInput[];
}

export interface UpdateDigitalMenuParametersRequest {
  enabled: boolean;
  slug?: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description?: string | null;
  salePrice: number;
  imageRef?: string | null;
  image?: string | null;
  sortOrder: number;
}

export interface PublicCategory {
  id: string;
  name: string;
  description?: string | null;
  imageRef?: string | null;
  image?: string | null;
  sortOrder: number;
  products: readonly PublicProduct[];
}

export interface PublicDigitalMenu {
  tenantId: string;
  organizationName: string;
  hasLogo: boolean;
  logo?: string | null;
  logoVersion: number;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  style: DigitalMenuStyle;
  categories: readonly PublicCategory[];
}
