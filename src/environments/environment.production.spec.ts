import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from './environment.production';

describe('Production runtime configuration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('prioritizes Kubernetes-injected endpoints over hostname defaults', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'dev.saviaup.com' },
      __env: {
        apiUrl: 'https://configured-api.example.test/v2',
        signalRUrl: 'https://configured-realtime.example.test/hubs',
      },
    });
    expect(environment.apiUrl).toBe('https://configured-api.example.test/v2');
    expect(environment.signalRUrl).toBe('https://configured-realtime.example.test/hubs');
  });

  it('derives the hub from the injected API URL when no hub is provided', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'dev.saviaup.com' },
      __env: { apiUrl: 'https://configured-api.example.test', signalRUrl: '' },
    });
    expect(environment.signalRUrl).toBe('https://configured-api.example.test/hubs');
  });

  it('preserves existing defaults when optional runtime values are empty', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      __env: { apiUrl: '', signalRUrl: '' },
    });
    expect(environment.apiUrl).toBe('http://localhost:5000');
    expect(environment.signalRUrl).toBe('http://localhost:5000/hubs');
  });
});
