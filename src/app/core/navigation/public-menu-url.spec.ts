import { buildPublicMenuUrl } from './public-menu-url';

describe('buildPublicMenuUrl', () => {
  it('creates a public menu URL using an encoded slug', () => {
    expect(buildPublicMenuUrl('https://menu.saviaup.com/', 'Café Central')).toBe(
      'https://menu.saviaup.com/Caf%C3%A9%20Central',
    );
  });

  it('preserves legacy query parameters', () => {
    expect(
      buildPublicMenuUrl('https://menu.saviaup.com', 'cafe-central', '?table=12&source=qr'),
    ).toBe('https://menu.saviaup.com/cafe-central?table=12&source=qr');
  });
});
