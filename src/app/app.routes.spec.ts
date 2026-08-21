import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('application routes', () => {
  it('registers categories as a top-level lazy app route', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const categoryRoute = appRoute?.children?.find((route) => route.path === 'categories');

    expect(categoryRoute).toBeDefined();
    expect(categoryRoute?.loadChildren).toBeTypeOf('function');
    expect(
      appRoute?.children?.find((route) => route.path === 'inventory/categories'),
    ).toBeUndefined();
  });

  it('registers inventory as a real lazy feature instead of a module placeholder', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const inventoryRoute = appRoute?.children?.find((route) => route.path === 'inventory');

    expect(inventoryRoute?.loadChildren).toBeTypeOf('function');
    expect(inventoryRoute?.loadComponent).toBeUndefined();
  });

  it('registers products as a real lazy feature instead of a module placeholder', () => {
    const appRoute = routes.find((route) => route.path === 'app');
    const productRoute = appRoute?.children?.find((route) => route.path === 'products');

    expect(productRoute?.loadChildren).toBeTypeOf('function');
    expect(productRoute?.loadComponent).toBeUndefined();
  });
});
