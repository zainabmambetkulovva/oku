'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { adminApi } from '@/lib/admin-api';
import { Button } from '../ui/button';
import { inputClass, Notice } from './ui';

/** Ручная выдача и отзыв доступа к аудиокниге (подарок, компенсация). */
export function AccessManager({ audiobookId }: { audiobookId: string }) {
  const t = useTranslations('admin.audiobooksAdmin');
  const tc = useTranslations('admin.common');
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [until, setUntil] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const grants = useQuery({
    queryKey: ['admin', 'access', audiobookId],
    queryFn: () => adminApi.accessGrants(audiobookId),
  });
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ['admin', 'access', audiobookId] });

  const grant = useMutation({
    mutationFn: () =>
      adminApi.grantAccess(
        audiobookId,
        email.trim(),
        until ? new Date(`${until}T23:59:59+06:00`).toISOString() : undefined,
      ),
    onSuccess: () => {
      setEmail('');
      setUntil('');
      setNotice({ tone: 'success', text: t('granted') });
      refresh();
    },
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 404
            ? t('userNotFound')
            : tc('error'),
      }),
  });
  const revoke = useMutation({
    mutationFn: (userId: string) => adminApi.revokeAccess(audiobookId, userId),
    onSuccess: refresh,
  });
  const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeZone: 'Asia/Bishkek' });

  return (
    <section className="card space-y-4 p-5 sm:p-6" data-testid="access">
      <h2 className="text-lg font-medium text-cocoa">{t('access')}</h2>
      <p className="text-sm text-ink/70">{t('accessHint')}</p>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(null);
          if (email.trim()) grant.mutate();
        }}
      >
        <label className="text-sm font-medium text-ink/85">
          {t('grantEmail')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-ink/85">
          {t('grantUntil')}
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={grant.isPending}>
          {t('grant')}
        </Button>
      </form>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {grants.data && grants.data.length === 0 && (
        <p className="text-sm text-muted">{t('noGrants')}</p>
      )}
      <ul className="divide-y divide-sand/60 text-sm">
        {grants.data?.map((item) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-center gap-3 py-2 ${item.isActive ? '' : 'opacity-60'}`}
            data-testid="grant"
          >
            <span className="flex-1 font-medium">{item.user.email}</span>
            <span className="text-xs text-muted">
              {item.orderItemId ? t('byOrder') : t('manual')} ·{' '}
              {item.revokedAt
                ? t('revoked')
                : item.expiresAt
                  ? t('until', { date: date.format(new Date(item.expiresAt)) })
                  : t('forever')}
            </span>
            {item.isActive && (
              <button
                type="button"
                className="text-xs font-semibold text-[#8a3524] underline"
                onClick={() =>
                  window.confirm(t('revokeConfirm', { email: item.user.email })) &&
                  revoke.mutate(item.user.id)
                }
              >
                {t('revoke')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
