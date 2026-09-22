const runtimeApiUrl = (): string => {
  const configured = (window as unknown as { __env?: { apiUrl?: string } }).__env?.apiUrl;
  if (configured?.trim() && !configured.startsWith('${')) return configured;

  const hostname = window.location.hostname;
  if (hostname.startsWith('dev-') || hostname.startsWith('dev.'))
    return 'https://dev-api.saviaup.com';
  if (hostname.startsWith('qa-') || hostname.startsWith('qa.')) return 'https://qa-api.saviaup.com';
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
  return 'https://api.saviaup.com';
};

export const environment = {
  production: true,
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
