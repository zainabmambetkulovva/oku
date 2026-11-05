import { randomInt } from 'crypto';

/** Без похожих символов (0/O, 1/I/L) — номер удобно диктовать по телефону. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Номер заказа: OKU-ГГММДД-XXXXX, например OKU-261105-7K3QX. */
export function generateOrderNumber(now = new Date()): string {
  const date = [now.getUTCFullYear() % 100, now.getUTCMonth() + 1, now.getUTCDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('');
  const suffix = Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `OKU-${date}-${suffix}`;
}
