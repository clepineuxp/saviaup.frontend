import {
  CategoryReference,
  Ingredient,
  InventoryItem,
  InventoryMovement,
  InventoryMovementDirection,
  InventoryMovementRecordedReason,
  MeasurementUnit,
  PagedResponse,
} from '../models/inventory.model';
import {
  CategoryLookupDto,
  CategoryReferenceDto,
  IngredientDto,
  InventoryItemDto,
  InventoryMovementDto,
  MeasurementUnitDto,
  PagedResponseDto,
} from './inventory.contracts';

export const mapCategoryReference = (
  dto: CategoryReferenceDto | CategoryLookupDto,
): CategoryReference => ({
  id: dto.id,
  name: dto.name,
  isInventoryTracked: dto.isInventoryTracked,
});

export const mapMeasurementUnit = (dto: MeasurementUnitDto): MeasurementUnit => ({ ...dto });

export const mapInventoryItem = (dto: InventoryItemDto): InventoryItem => ({
  ...dto,
  category: mapCategoryReference(dto.category),
  unit: mapMeasurementUnit(dto.unit),
});

export const mapIngredient = (dto: IngredientDto): Ingredient => ({
  ...dto,
  category: mapCategoryReference(dto.category),
  unit: mapMeasurementUnit(dto.unit),
});

export const mapInventoryMovement = (dto: InventoryMovementDto): InventoryMovement => ({
  ...dto,
  direction: dto.direction as InventoryMovementDirection,
  reason: dto.reason as InventoryMovementRecordedReason,
  unit: mapMeasurementUnit(dto.unit),
});

export const mapPage = <TDto, TModel>(
  dto: PagedResponseDto<TDto>,
  mapItem: (item: TDto) => TModel,
): PagedResponse<TModel> => ({
  items: dto.items.map(mapItem),
  page: dto.page,
  pageSize: dto.pageSize,
  totalCount: dto.totalCount,
  totalPages: dto.totalPages,
});
