const getApiHost = (): string => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { apiUrl?: string } }).__env?.apiUrl;
    if (custom && custom.trim() !== '') return custom;
  }
  return `http://${getApiHost()}:5000`;
};

const getSignalRUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { signalRUrl?: string } }).__env?.signalRUrl;
    if (custom && custom.trim() !== '') return custom;
  }
  const apiUrl = getApiUrl();
  return apiUrl.endsWith('/hubs') ? apiUrl : `${apiUrl}/hubs`;
};

const getMenuFrontendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { menuFrontendUrl?: string } }).__env
      ?.menuFrontendUrl;
    if (custom?.trim()) return custom;
  }
  return `http://${getApiHost()}:4201`;
};

export const environment = {
  production: false,
  useMockApi: false,
  get apiUrl(): string {
    return getApiUrl();
  },
  get signalRUrl(): string {
    return getSignalRUrl();
  },
  get menuFrontendUrl(): string {
    return getMenuFrontendUrl();
  },
};
