import type { ApiError, Paginated } from './types';

/** Адрес API: на сервере — API_URL, в браузере — NEXT_PUBLIC_API_URL. */
export function apiBaseUrl(): string {
  const url =
    typeof window === 'undefined'
      ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)
      : process.env.NEXT_PUBLIC_API_URL;
  return (url ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '');
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
    headers: { Accept: 'application/json', ...init.headers },
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
