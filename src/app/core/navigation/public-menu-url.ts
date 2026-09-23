export const buildPublicMenuUrl = (baseUrl: string, slug: string, queryString = ''): string => {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const normalizedQueryString = queryString.trim();
  const querySuffix =
    normalizedQueryString.length === 0
      ? ''
      : normalizedQueryString.startsWith('?')
        ? normalizedQueryString
        : `?${normalizedQueryString}`;

  return `${normalizedBaseUrl}/${encodeURIComponent(slug.trim())}${querySuffix}`;
};
