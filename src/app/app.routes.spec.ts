import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('application routes', () => {
  it('registers categories as a lazy inventory route', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const categoryRoute = appRoute?.children?.find(
      (route) => route.path === 'inventory/categories',
    );

    expect(categoryRoute).toBeDefined();
    expect(categoryRoute?.loadChildren).toBeTypeOf('function');
  });
});
