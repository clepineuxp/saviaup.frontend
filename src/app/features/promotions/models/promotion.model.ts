export type PromotionType = 'GENERAL' | 'QUANTITY';
export type PromotionValueType = 'PERCENTAGE' | 'FIXEDPRICE' | 'FIXED_PRICE';
export type PromotionTargetType = 'PRODUCT' | 'VARIATION' | 'CATEGORY' | 'MENU';

export interface PromotionTarget {
  readonly targetType: PromotionTargetType;
  readonly productId: string | null;
  readonly productName: string | null;
  readonly productVariationId: string | null;
  readonly productVariationName: string | null;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
}

export interface Promotion {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: PromotionType;
  readonly valueType: PromotionValueType;
  readonly value: number;
  readonly requiredQuantity: number | null;
  readonly discountedQuantity: number | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly specificDate: string | null;
  readonly monthOfYear: number | null;
  readonly weekDaysMask: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly targets: readonly PromotionTarget[];
}

export interface PromotionTargetRequest {
  readonly targetType: PromotionTargetType;
  readonly productId?: string | null;
  readonly productVariationId?: string | null;
  readonly categoryId?: string | null;
}

export interface SavePromotionRequest {
  readonly name: string;
  readonly description: string | null;
  readonly type: PromotionType;
  readonly valueType: PromotionValueType;
  readonly value: number;
  readonly requiredQuantity: number | null;
  readonly discountedQuantity: number | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly specificDate: string | null;
  readonly monthOfYear: number | null;
  readonly weekDaysMask: number;
  readonly targets: readonly PromotionTargetRequest[];
  readonly isActive: boolean;
}
