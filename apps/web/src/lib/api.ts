import type { ApiError, Paginated } from './types';

/** Все маршруты API начинаются с этого префикса (глобальный префикс NestJS). */
export const API_PREFIX = '/api/v1';

const trimSlashes = (url: string) => url.replace(/\/+$/, '');

/**
 * Адрес API.
 *
 * На сервере (серверные компоненты, route handlers):
 * 1. API_SERVICE_URL — внутренний адрес сервиса api, который Vercel подставляет
 *    через binding в vercel.json (только во время выполнения функций);
 * 2. API_URL — явный адрес для локальной разработки и CI;
 * 3. NEXT_PUBLIC_API_URL, иначе http://localhost:3000/api/v1.
 *
 * В браузере: NEXT_PUBLIC_API_URL, если задан, иначе относительный /api/v1 —
 * на Vercel сайт и API работают на одном домене (rewrite /api/* → api).
 */
export function apiBaseUrl(): string {
  if (typeof window === 'undefined') {
    if (process.env.API_SERVICE_URL) {
      return `${trimSlashes(process.env.API_SERVICE_URL)}${API_PREFIX}`;
    }
    return trimSlashes(
      process.env.API_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        `http://localhost:3000${API_PREFIX}`,
    );
  }
  return trimSlashes(process.env.NEXT_PUBLIC_API_URL ?? API_PREFIX);
}

/**
 * Служебный заголовок для запросов сервера сайта: с ним API не применяет общий лимит
 * частоты (все серверные запросы приходят с одного адреса). Ключ INTERNAL_API_TOKEN
 * доступен только на сервере — в браузерный код Next.js его не встраивает.
 */
export function internalHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const token = process.env.INTERNAL_API_TOKEN;
  return token ? { 'x-oku-internal-token': token } : {};
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    super(body?.message ?? `API request failed with status ${status}`);
  }
}

/** Запрос к API: разворачивает { data }, ошибки API превращает в ApiRequestError. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...internalHeaders(),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }
  const body = (await response.json().catch(() => null)) as
    ({ data?: T } & Partial<ApiError>) | null;
  if (!response.ok) {
    throw new ApiRequestError(response.status, (body as ApiError | null) ?? null);
  }
  return body?.data as T;
}

/** Список с пагинацией: возвращает { data, meta } без разворачивания. */
export async function apiFetchPage<T>(path: string, init: RequestInit = {}): Promise<Paginated<T>> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...internalHeaders(), ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as Paginated<T> | ApiError | null;
  if (!response.ok || !body || !('data' in body)) {
    throw new ApiRequestError(response.status, (body as ApiError | null) ?? null);
  }
  return body;
}

/**
 * Данные для серверной отрисовки: при недоступном API страница не падает,
 * а показывает пустой блок. Ошибка пишется в лог сервера.
 */
export async function safely<T>(load: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(`[api] ${label} failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}
