import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Токен отписки: e-mail + HMAC. Не хранится в базе и не истекает —
 * ссылка из старого письма продолжает работать. Подделать его без секрета нельзя.
 */
export function createUnsubscribeToken(email: string, secret: string): string {
  const payload = Buffer.from(email).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** E-mail из токена или null, если токен подделан. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return Buffer.from(payload, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', `newsletter:${secret}`).update(payload).digest('base64url');
}
