import { fullAccessReason, isGrantActive, streamUrlTtlSeconds } from './access-rules';

const now = new Date('2026-11-05T12:00:00Z');
const past = new Date('2026-11-01T00:00:00Z');
const future = new Date('2026-12-01T00:00:00Z');

const paid = { price: 45_000, status: 'ACTIVE' as const };
const free = { price: 0, status: 'ACTIVE' as const };
const user = { role: 'USER' as const };
const admin = { role: 'ADMIN' as const };

describe('isGrantActive', () => {
  it('is active when not revoked and not expired (lifetime when expiresAt is null)', () => {
    expect(isGrantActive({ revokedAt: null, expiresAt: null }, now)).toBe(true);
    expect(isGrantActive({ revokedAt: null, expiresAt: future }, now)).toBe(true);
  });

  it('is inactive when revoked, expired or missing', () => {
    expect(isGrantActive({ revokedAt: past, expiresAt: null }, now)).toBe(false);
    expect(isGrantActive({ revokedAt: null, expiresAt: past }, now)).toBe(false);
    expect(isGrantActive(null, now)).toBe(false);
  });
});

describe('fullAccessReason', () => {
  it('gives guests no full access, even to free audiobooks', () => {
    expect(fullAccessReason(undefined, paid, null, now)).toBeNull();
    expect(fullAccessReason(undefined, free, null, now)).toBeNull();
  });

  it('gives registered users full access to free audiobooks', () => {
    expect(fullAccessReason(user, free, null, now)).toBe('free');
    expect(fullAccessReason(user, { ...free, status: 'DRAFT' }, null, now)).toBeNull();
  });

  it('requires an active grant for paid audiobooks', () => {
    expect(fullAccessReason(user, paid, null, now)).toBeNull();
    expect(fullAccessReason(user, paid, { revokedAt: null, expiresAt: null }, now)).toBe(
      'purchased',
    );
    expect(fullAccessReason(user, paid, { revokedAt: past, expiresAt: null }, now)).toBeNull();
  });

  it('keeps access for buyers after the audiobook is archived', () => {
    expect(
      fullAccessReason(
        user,
        { ...paid, status: 'ARCHIVED' },
        { revokedAt: null, expiresAt: null },
        now,
      ),
    ).toBe('purchased');
  });

  it('lets administrators listen to everything', () => {
    expect(fullAccessReason(admin, { ...paid, status: 'DRAFT' }, null, now)).toBe('admin');
  });
});

describe('streamUrlTtlSeconds', () => {
  it('lasts at least 15 minutes and at most 6 hours', () => {
    expect(streamUrlTtlSeconds(10)).toBe(15 * 60);
    expect(streamUrlTtlSeconds(30 * 60)).toBe(70 * 60);
    expect(streamUrlTtlSeconds(10 * 60 * 60)).toBe(6 * 60 * 60);
  });
});
