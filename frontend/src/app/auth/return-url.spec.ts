import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/cart', '/checkout?step=2', '/products/abc#top'])('keeps the in-app path %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each([
    undefined,
    null,
    '',
    'https://evil.example/phish',
    '//evil.example/phish',
    '/\\evil.example',
    'javascript:alert(1)',
    'cart',
  ])('falls back to the home page for %s', (url) => {
    expect(safeReturnUrl(url)).toBe('/');
  });
});
