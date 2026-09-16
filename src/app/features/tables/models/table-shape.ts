import { RestaurantTableShape } from './table.model';

export interface TableShapeDimensions {
  readonly width: number;
  readonly height: number;
}

export const TABLE_SHAPE_DIMENSIONS: Readonly<Record<RestaurantTableShape, TableShapeDimensions>> =
  {
    SQUARE: { width: 100, height: 100 },
    ROUND: { width: 100, height: 100 },
    RECTANGLE_HORIZONTAL: { width: 150, height: 100 },
    RECTANGLE_VERTICAL: { width: 100, height: 150 },
  };

export function tableShapeDimensions(
  shape: RestaurantTableShape | null | undefined,
): TableShapeDimensions {
  return TABLE_SHAPE_DIMENSIONS[shape ?? 'SQUARE'];
}
