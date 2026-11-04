import { generateSecureToken, hashToken } from './tokens';

describe('tokens', () => {
  it('generates long unique url-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateSecureToken));

    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('hashes tokens deterministically with SHA-256', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});
