import { createUnsubscribeToken, verifyUnsubscribeToken } from './newsletter-token';

describe('newsletter unsubscribe token', () => {
  it('round-trips the e-mail', () => {
    const token = createUnsubscribeToken('reader@oku24.kg', 'secret');
    expect(verifyUnsubscribeToken(token, 'secret')).toBe('reader@oku24.kg');
  });

  it('rejects forged tokens', () => {
    const token = createUnsubscribeToken('reader@oku24.kg', 'secret');
    const [, signature] = token.split('.');
    const forged = `${Buffer.from('victim@oku24.kg').toString('base64url')}.${signature}`;

    expect(verifyUnsubscribeToken(token, 'other-secret')).toBeNull();
    expect(verifyUnsubscribeToken(forged, 'secret')).toBeNull();
    expect(verifyUnsubscribeToken('garbage', 'secret')).toBeNull();
  });
});
