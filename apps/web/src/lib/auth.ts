'use client';

import { create } from 'zustand';
import { apiBaseUrl, ApiRequestError } from './api';
import type { ApiError } from './types';

export type UserRole = 'USER' | 'ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

interface AuthResponse {
  user: SessionUser;
  accessToken: string;
  accessTokenExpiresAt: string;
}

interface AuthState {
  /** unknown — ещё не проверяли cookie; guest — не вошёл */
  status: 'unknown' | 'guest' | 'authenticated';
  user: SessionUser | null;
  accessToken: string | null;
  setSession: (session: AuthResponse | null) => void;
}

/**
 * Сессия в памяти вкладки: короткий access-токен и пользователь.
 * Refresh-токен — в httpOnly cookie (JavaScript его не видит), поэтому после
 * перезагрузки страницы сессия восстанавливается запросом /auth/refresh.
 */
export const useAuth = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  accessToken: null,
  setSession: (session) =>
    set(
      session
        ? { status: 'authenticated', user: session.user, accessToken: session.accessToken }
        : { status: 'guest', user: null, accessToken: null },
    ),
}));

async function readError(response: Response): Promise<ApiRequestError> {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  return new ApiRequestError(response.status, body);
}

async function authRequest(path: string, body?: unknown): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl()}/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await readError(response);
  const json = (await response.json()) as { data: AuthResponse };
  return json.data;
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const session = await authRequest('login', { email, password });
  useAuth.getState().setSession(session);
  return session.user;
}

let refreshing: Promise<boolean> | null = null;

/** Обновляет access-токен по cookie. Параллельные вызовы ждут один запрос. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= authRequest('refresh')
    .then((session) => {
      useAuth.getState().setSession(session);
      return true;
    })
    .catch(() => {
      useAuth.getState().setSession(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function logout(): Promise<void> {
  await fetch(`${apiBaseUrl()}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(
    () => undefined,
  );
  useAuth.getState().setSession(null);
}

/**
 * Запрос от имени пользователя: подставляет access-токен, при 401 один раз
 * обновляет сессию и повторяет. Возвращает поле data ответа API.
 */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = () =>
    fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(useAuth.getState().accessToken
          ? { Authorization: `Bearer ${useAuth.getState().accessToken}` }
          : {}),
        ...init.headers,
      },
    });

  let response = await send();
  if (response.status === 401 && (await refreshSession())) {
    response = await send();
  }
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw await readError(response);
  const json = (await response.json()) as { data: T; meta?: unknown };
  return (json.meta === undefined ? json.data : json) as T;
}
