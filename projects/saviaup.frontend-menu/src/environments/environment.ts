const runtimeApiUrl = (): string => {
  const configured = (window as unknown as { __env?: { apiUrl?: string } }).__env?.apiUrl;
  return configured?.trim() || 'http://localhost:5000';
};

export const environment = {
  production: false,
  useMockApi: false,
  get apiUrl(): string {
    return runtimeApiUrl();
  },
  get signalRUrl(): string {
    return `${runtimeApiUrl().replace(/\/$/, '')}/hubs`;
  },
  get menuFrontendUrl(): string {
    return window.location.origin;
  },
};
