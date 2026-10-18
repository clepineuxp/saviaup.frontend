import { PromotionTargetType, PromotionType, PromotionValueType } from '../models/promotion.model';

export interface PromotionTargetDto {
  readonly targetType: string;
  readonly productId: string | null;
  readonly productName: string | null;
  readonly productVariationId: string | null;
  readonly productVariationName: string | null;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
}

export interface PromotionDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: string;
  readonly valueType: string;
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
  readonly targets: readonly PromotionTargetDto[];
}

export interface SavePromotionDto {
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
  readonly targets: readonly {
    readonly targetType: PromotionTargetType;
    readonly productId?: string | null;
    readonly productVariationId?: string | null;
    readonly categoryId?: string | null;
  }[];
  readonly isActive: boolean;
}
