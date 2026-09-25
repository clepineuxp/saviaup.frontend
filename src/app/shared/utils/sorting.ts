export type SortDirection = 'asc' | 'desc';
export type SortValue = string | number | boolean | null | undefined;

export function sortByValue<T>(
  items: readonly T[],
  direction: SortDirection,
  valueOf: (item: T) => SortValue,
): T[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftValue = valueOf(left.item);
      const rightValue = valueOf(right.item);

      if (leftValue === null || leftValue === undefined) {
        return rightValue === null || rightValue === undefined ? left.index - right.index : 1;
      }
      if (rightValue === null || rightValue === undefined) return -1;

      const comparison =
        typeof leftValue === 'string' && typeof rightValue === 'string'
          ? leftValue.localeCompare(rightValue, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          : Number(leftValue) - Number(rightValue);

      return comparison === 0 ? left.index - right.index : comparison * multiplier;
    })
    .map(({ item }) => item);
}
