'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetch, useAuth } from '@/lib/auth';

/** Запросы кабинета: только для вошедшего, ключ включает id пользователя. */
export function useAccountQuery<T>(key: string, path: string) {
  const user = useAuth((state) => state.user);
  return useQuery({
    queryKey: ['account', user?.id, key, path],
    queryFn: () => authFetch<T>(path),
    enabled: Boolean(user),
    staleTime: 10_000,
  });
}

export function useInvalidateAccount() {
  const client = useQueryClient();
  return (key?: string) =>
    client.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'account' && (key === undefined || query.queryKey[2] === key),
    });
}

/** Число непрочитанных уведомлений (для меню кабинета и шапки). */
export function useUnreadCount(): number {
  const { data } = useAccountQuery<{ unread: number }>(
    'unread',
    '/users/me/notifications/unread-count',
  );
  return data?.unread ?? 0;
}
