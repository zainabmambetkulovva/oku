import { createHash, randomBytes } from 'crypto';

/** Случайный секретный токен (256 бит) для refresh-токенов и ссылок из писем. */
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

/** В БД хранятся только SHA-256 хеши токенов — утечка базы не даёт рабочих токенов. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
