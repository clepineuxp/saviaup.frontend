import { menuRoutes } from './app.routes';

describe('menuRoutes', () => {
  it('only exposes the public menu and public not-found routes', () => {
    expect(menuRoutes.map((route) => route.path)).toEqual(['m/:slug', ':slug', '**']);
    expect(menuRoutes.every((route) => !route.canActivate?.length)).toBe(true);
  });

  it('supports both the legacy and short public URL formats', () => {
    expect(menuRoutes.find((route) => route.path === 'm/:slug')).toBeDefined();
    expect(menuRoutes.find((route) => route.path === ':slug')).toBeDefined();
  });

  it('does not expose private application routes', () => {
    expect(menuRoutes.some((route) => route.path === 'login' || route.path === 'app')).toBe(false);
  });
});
