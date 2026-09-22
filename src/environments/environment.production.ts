const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { apiUrl?: string } }).__env?.apiUrl;
    if (custom && custom.trim() !== '' && !custom.startsWith('${')) return custom;

    const hostname = window.location?.hostname ?? '';
    if (hostname.startsWith('dev.') || hostname === 'dev.saviaup.com') {
      return 'https://dev.api.saviaup.com';
    }
    if (hostname.startsWith('qa.') || hostname === 'qa.saviaup.com') {
      return 'https://qa.api.saviaup.com';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  return 'https://api.saviaup.com';
};

const getSignalRUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { signalRUrl?: string } }).__env?.signalRUrl;
    if (custom && custom.trim() !== '' && !custom.startsWith('${')) return custom;
  }
  return `${getApiUrl()}/hubs`;
};

const getMenuFrontendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = (window as unknown as { __env?: { menuFrontendUrl?: string } }).__env
      ?.menuFrontendUrl;
    if (custom?.trim() && !custom.startsWith('${')) return custom;

    const hostname = window.location?.hostname ?? '';
    if (hostname.startsWith('dev-') || hostname.startsWith('dev.')) {
      return 'https://dev-menu.saviaup.com';
    }
    if (hostname.startsWith('qa-') || hostname.startsWith('qa.')) {
      return 'https://qa-menu.saviaup.com';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4201';
    }
  }
  return 'https://menu.saviaup.com';
};

export const environment = {
  production: true,
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
