import { stableKey } from './stable-key';

describe('stableKey', () => {
  it('does not depend on the order of fields and skips undefined', () => {
    expect(stableKey({ page: 1, sort: 'newest', search: undefined })).toBe(
      stableKey({ sort: 'newest', page: 1 }),
    );
  });

  it('distinguishes different values', () => {
    expect(stableKey({ page: 1 })).not.toBe(stableKey({ page: 2 }));
    expect(stableKey({ inStock: false })).toBe('inStock=false');
  });
});
