import { timingSafeEqual } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';

/** Заголовок, которым сервер сайта (SSR) подтверждает, что запрос идёт от него. */
export const INTERNAL_TOKEN_HEADER = 'x-oku-internal-token';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(',')[0]?.trim() || undefined;
}

/**
 * Запрос от сервера сайта с правильным служебным ключом не ограничивается:
 * все страницы, которые сайт рисует на сервере, приходят в API с одного адреса,
 * и общий лимит иначе срабатывал бы на всех посетителей сразу.
 * Без настроенного ключа (INTERNAL_API_TOKEN) пропусков нет.
 */
export function isInternalRequest(request: RequestLike, expected: string | undefined): boolean {
  if (!expected) return false;
  const given = firstHeader(request.headers[INTERNAL_TOKEN_HEADER]);
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Кого считать «одним клиентом» для лимита. На Vercel адрес посетителя приходит в
 * заголовке x-vercel-forwarded-for — его выставляет сама платформа, подделать нельзя.
 * В остальных случаях — адрес соединения.
 */
export function clientTracker(request: RequestLike, onVercel: boolean): string {
  if (onVercel) {
    const forwarded =
      firstHeader(request.headers['x-vercel-forwarded-for']) ??
      firstHeader(request.headers['x-real-ip']);
    if (forwarded) return forwarded;
  }
  return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}

export function throttlerHooks(internalToken: string | undefined, onVercel: boolean) {
  return {
    skipIf: (context: ExecutionContext) =>
      isInternalRequest(context.switchToHttp().getRequest<RequestLike>(), internalToken),
    getTracker: (request: Record<string, unknown>) =>
      clientTracker(request as unknown as RequestLike, onVercel),
  };
}
