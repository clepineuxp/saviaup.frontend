const getApiHost = (): string => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

const host = getApiHost();

export const environment = {
  production: false,
  useMockApi: false,
  apiUrl: `http://${host}:5000`,
  signalRUrl: `http://${host}:5000/hubs`,
} as const;
