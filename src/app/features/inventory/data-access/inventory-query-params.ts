export const compactParams = <T extends object>(
  values: T,
): Readonly<Record<string, string | number | boolean>> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== '')
      .map(([key, value]) => [key, value as string | number | boolean]),
  );
