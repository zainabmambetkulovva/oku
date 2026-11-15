'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { authFetch, useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import type { OrderDetails, Paginated } from '@/lib/types';
import { FormAlert } from '../auth/auth-card';
import { BookCover } from '../catalog/book-cover';
import { OrderStatusBadge } from '../checkout/order-status';
import { buttonClasses } from '../ui/button';
import { useAccountQuery, useInvalidateAccount } from './use-account';

export interface LibraryItem {
  audiobook: {
    id: string;
    slug: string;
    title: string;
    author: string;
    narrator: string | null;
    coverUrl: string | null;
    durationSeconds: number;
    isAvailableForSale: boolean;
  };
  grantedAt?: string;
  expiresAt?: string | null;
  progress: {
    chapterId: string | null;
    positionSeconds: number;
    completed: boolean;
    percent: number;
    lastListenedAt: string | null;
  } | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function useDate() {
  const locale = useLocale();
  return (value: string, withTime = false) =>
    new Intl.DateTimeFormat(locale === 'ky' ? 'ky-KG' : 'ru-RU', {
      dateStyle: 'long',
      ...(withTime && { timeStyle: 'short' }),
      timeZone: 'Asia/Bishkek',
    }).format(new Date(value));
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-display text-2xl text-cocoa">{children}</h2>
      {action}
    </div>
  );
}

function Loading() {
  const t = useTranslations('account');
  return <p className="animate-pulse text-sm text-muted">{t('loading')}</p>;
}

function Failed() {
  const t = useTranslations('account');
  return <FormAlert>{t('error')}</FormAlert>;
}

// ─── Заказы ──────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: OrderDetails }) {
  const t = useTranslations('account.orders');
  const date = useDate();
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4 sm:p-5" data-testid="order-row">
      <div className="flex -space-x-3">
        {order.items.slice(0, 3).map((item) => (
          <span key={item.id} className="w-10 rounded-md ring-2 ring-milk">
            <BookCover
              slug={item.id}
              title={item.title}
              author={item.author}
              coverUrl={item.coverUrl}
              square={item.productType === 'AUDIOBOOK'}
            />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{t('number', { number: order.orderNumber })}</p>
        <p className="text-xs text-muted">
          {date(order.createdAt)} · {t('items', { count })}
        </p>
      </div>
      <OrderStatusBadge order={order} />
      <p className="w-24 text-right font-semibold text-cocoa">{formatPrice(order.total)}</p>
      <Link
        href={`/orders/${order.orderNumber}`}
        className="text-sm font-semibold text-cocoa underline-offset-2 hover:underline"
      >
        {t('open')}
      </Link>
    </li>
  );
}

export function OrdersList({ limit, compact = false }: { limit: number; compact?: boolean }) {
  const t = useTranslations('account.orders');
  const [pages, setPages] = useState(1);
  const { data, isLoading, isError } = useAccountQuery<Paginated<OrderDetails>>(
    'orders',
    `/orders?limit=${limit * pages}`,
  );
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed />;
  if (data.data.length === 0) {
    return (
      <div className="card p-6 text-sm" data-testid="orders-empty">
        <p className="text-ink/75">{t('empty')}</p>
        {!compact && (
          <Link href="/books" className={buttonClasses('primary', 'mt-4')}>
            {t('toCatalog')}
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {data.data.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </ul>
      {!compact && data.meta.total > data.data.length && (
        <button
          type="button"
          onClick={() => setPages(pages + 1)}
          className="w-full rounded-full border border-sand bg-white/60 py-3 text-sm font-semibold text-cocoa hover:bg-white"
        >
          {t('more')}
        </button>
      )}
    </div>
  );
}

// ─── Аудиокниги ──────────────────────────────────────────────────────────────

function LibraryCard({ item }: { item: LibraryItem }) {
  const t = useTranslations('account.audiobooks');
  const date = useDate();
  const progress = item.progress;
  return (
    <li className="card flex gap-4 p-4" data-testid="library-item">
      <Link href={`/audiobooks/${item.audiobook.slug}#preview`} className="w-20 shrink-0">
        <BookCover
          slug={item.audiobook.slug}
          title={item.audiobook.title}
          author={item.audiobook.author}
          coverUrl={item.audiobook.coverUrl}
          square
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-semibold text-ink">{item.audiobook.title}</p>
        <p className="text-xs text-muted">{item.audiobook.author}</p>
        <div className="h-1.5 rounded-full bg-sand/50" aria-hidden="true">
          <div
            className="h-1.5 rounded-full bg-gold"
            style={{ width: `${progress?.completed ? 100 : (progress?.percent ?? 0)}%` }}
          />
        </div>
        <p className="text-xs text-ink/70" data-testid="library-progress">
          {progress?.completed
            ? t('completed')
            : progress
              ? t('progress', { percent: progress.percent })
              : t('notStarted')}
        </p>
        {item.expiresAt !== undefined && (
          <p className="text-[0.7rem] text-muted">
            {item.expiresAt ? t('until', { date: date(item.expiresAt) }) : t('forever')}
          </p>
        )}
        <Link
          href={`/audiobooks/${item.audiobook.slug}#preview`}
          className={buttonClasses('primary', 'mt-auto w-fit px-5 py-2 text-xs')}
        >
          {progress && !progress.completed ? t('continue') : t('listen')}
        </Link>
      </div>
    </li>
  );
}

export function Library({ limit = 50 }: { limit?: number }) {
  const t = useTranslations('account.audiobooks');
  const { data, isLoading, isError } = useAccountQuery<Paginated<LibraryItem>>(
    'library',
    `/users/me/audiobooks?limit=${limit}`,
  );
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed />;
  if (data.data.length === 0) {
    return (
      <div className="card p-6 text-sm" data-testid="library-empty">
        <p className="text-ink/75">{t('empty')}</p>
        <Link href="/audiobooks" className={buttonClasses('primary', 'mt-4')}>
          {t('toCatalog')}
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {data.data.map((item) => (
        <LibraryCard key={item.audiobook.id} item={item} />
      ))}
    </ul>
  );
}

export function ListeningHistory({ limit }: { limit: number }) {
  const t = useTranslations('account.audiobooks');
  const date = useDate();
  const { data } = useAccountQuery<Paginated<LibraryItem>>(
    'history',
    `/users/me/listening?limit=${limit}`,
  );
  if (!data || data.data.length === 0) return null;
  return (
    <ul className="space-y-2" data-testid="listening-history">
      {data.data.map((item) => (
        <li key={item.audiobook.id} className="card flex items-center gap-3 p-3 text-sm">
          <span className="w-10 shrink-0">
            <BookCover
              slug={item.audiobook.slug}
              title={item.audiobook.title}
              author={item.audiobook.author}
              coverUrl={item.audiobook.coverUrl}
              square
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{item.audiobook.title}</span>
            <span className="text-xs text-muted">
              {item.progress?.lastListenedAt &&
                t('lastListened', { date: date(item.progress.lastListenedAt, true) })}
              {item.progress && ` · ${t('progress', { percent: item.progress.percent })}`}
            </span>
          </span>
          <Link
            href={`/audiobooks/${item.audiobook.slug}#preview`}
            className="shrink-0 font-semibold text-cocoa underline-offset-2 hover:underline"
          >
            {t('continue')}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── Уведомления ─────────────────────────────────────────────────────────────

export function NotificationsList() {
  const t = useTranslations('account.notifications');
  const date = useDate();
  const invalidate = useInvalidateAccount();
  const [pages, setPages] = useState(1);
  const { data, isLoading, isError } = useAccountQuery<Paginated<NotificationItem>>(
    'notifications',
    `/users/me/notifications?limit=${20 * pages}`,
  );
  const refresh = () => {
    void invalidate('notifications');
    void invalidate('unread');
  };
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed />;
  if (data.data.length === 0) return <p className="card p-6 text-sm text-ink/75">{t('empty')}</p>;
  const hasUnread = data.data.some((item) => !item.isRead);

  return (
    <div className="space-y-4">
      {hasUnread && (
        <button
          type="button"
          onClick={() =>
            void authFetch('/users/me/notifications/read-all', { method: 'POST' }).then(refresh)
          }
          className="text-sm font-semibold text-cocoa underline"
        >
          {t('markAll')}
        </button>
      )}
      <ul className="space-y-3">
        {data.data.map((item) => (
          <li
            key={item.id}
            className={`card p-4 ${item.isRead ? 'opacity-80' : 'ring-2 ring-gold/40'}`}
            data-testid="notification"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-ink">
                {!item.isRead && (
                  <span className="mr-2 rounded-full bg-gold px-2 py-0.5 text-[0.65rem] text-cocoa-900">
                    {t('unread')}
                  </span>
                )}
                {item.title}
              </p>
              <span className="text-xs text-muted">{date(item.createdAt, true)}</span>
            </div>
            <p className="mt-1 text-sm text-ink/80">{item.message}</p>
            {!item.isRead && (
              <button
                type="button"
                onClick={() =>
                  void authFetch(`/users/me/notifications/${item.id}/read`, {
                    method: 'PATCH',
                  }).then(refresh)
                }
                className="mt-2 text-xs font-semibold text-cocoa underline"
              >
                {t('markRead')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {data.meta.total > data.data.length && (
        <button
          type="button"
          onClick={() => setPages(pages + 1)}
          className="w-full rounded-full border border-sand bg-white/60 py-3 text-sm font-semibold text-cocoa"
        >
          {t('more')}
        </button>
      )}
    </div>
  );
}

// ─── Обзор ───────────────────────────────────────────────────────────────────

export function AccountOverview() {
  const t = useTranslations('account');
  const locale = useLocale();
  const user = useAuth((state) => state.user);
  const [resent, setResent] = useState(false);
  if (!user) return null;
  const name = user.firstName || user.email.split('@')[0];

  return (
    <div className="space-y-10">
      <div>
        <p className="font-display text-2xl text-cocoa" data-testid="account-hello">
          {t('hello', { name })}
        </p>
        {!user.emailVerified && (
          <div className="mt-4">
            <FormAlert tone="info">
              {t('unverified', { email: user.email })}{' '}
              {resent ? (
                <strong>{t('resent')}</strong>
              ) : (
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() =>
                    void authFetch('/auth/resend-verification', {
                      method: 'POST',
                      body: JSON.stringify({ locale }),
                    })
                      .catch(() => undefined)
                      .then(() => setResent(true))
                  }
                >
                  {t('resend')}
                </button>
              )}
            </FormAlert>
          </div>
        )}
      </div>
      <section>
        <SectionTitle
          action={
            <Link href="/account/orders" className="text-sm font-semibold text-cocoa underline">
              {t('allOrders')}
            </Link>
          }
        >
          {t('recentOrders')}
        </SectionTitle>
        <OrdersList limit={3} compact />
      </section>
      <section>
        <SectionTitle
          action={
            <Link href="/account/audiobooks" className="text-sm font-semibold text-cocoa underline">
              {t('allAudiobooks')}
            </Link>
          }
        >
          {t('nav.audiobooks')}
        </SectionTitle>
        <Library limit={4} />
      </section>
    </div>
  );
}
