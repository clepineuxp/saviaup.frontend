const runtimeApiUrl = (): string => {
  const configured = (window as unknown as { __env?: { apiUrl?: string } }).__env?.apiUrl;
  return configured?.trim() || 'http://localhost:5000';
};

export const environment = {
  production: false,
  get apiUrl(): string {
    return runtimeApiUrl();
  },
};
