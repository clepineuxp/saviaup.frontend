import { PromotionDto, PromotionTargetDto } from './promotion.contracts';
import { Promotion, PromotionTarget } from '../models/promotion.model';

const normalizeTarget = (target: PromotionTargetDto): PromotionTarget => ({
  ...target,
  targetType: target.targetType.toUpperCase() as PromotionTarget['targetType'],
});

export const mapPromotion = (dto: PromotionDto): Promotion => ({
  ...dto,
  type: dto.type.toUpperCase() as Promotion['type'],
  valueType: dto.valueType.toUpperCase() as Promotion['valueType'],
  targets: dto.targets.map(normalizeTarget),
});
