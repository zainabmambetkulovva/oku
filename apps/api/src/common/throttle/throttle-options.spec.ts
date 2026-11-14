import { clientTracker, INTERNAL_TOKEN_HEADER, isInternalRequest } from './throttle-options';

const token = 'x'.repeat(40);

describe('throttle options', () => {
  it('skips only requests with the exact internal token', () => {
    expect(isInternalRequest({ headers: { [INTERNAL_TOKEN_HEADER]: token } }, token)).toBe(true);
    expect(isInternalRequest({ headers: { [INTERNAL_TOKEN_HEADER]: 'wrong' } }, token)).toBe(false);
    expect(isInternalRequest({ headers: {} }, token)).toBe(false);
    // Без настроенного ключа пропусков нет
    expect(isInternalRequest({ headers: { [INTERNAL_TOKEN_HEADER]: '' } }, undefined)).toBe(false);
    expect(isInternalRequest({ headers: { [INTERNAL_TOKEN_HEADER]: token } }, undefined)).toBe(
      false,
    );
  });

  it('uses the visitor address on Vercel and the socket address elsewhere', () => {
    const request = {
      ip: '10.0.0.1',
      headers: { 'x-vercel-forwarded-for': '203.0.113.7, 10.0.0.1', 'x-real-ip': '198.51.100.1' },
    };
    expect(clientTracker(request, true)).toBe('203.0.113.7');
    // Вне Vercel заголовкам не доверяем — их может подставить кто угодно
    expect(clientTracker(request, false)).toBe('10.0.0.1');
    expect(clientTracker({ ip: '10.0.0.2', headers: {} }, true)).toBe('10.0.0.2');
  });
});
