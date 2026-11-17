'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ListState, Notice, OrderStatusPill, PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { adminApi, type AdminUser } from '@/lib/admin-api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';

/** Карточка пользователя: статистика, заказы, блокировка, снятие блокировки входа, роль. */
export default function AdminUserPage() {
  const t = useTranslations('admin.usersAdmin');
  const tc = useTranslations('admin.common');
  const { id } = useParams<{ id: string }>();
  const me = useAuth((state) => state.user);
  const client = useQueryClient();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const user = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => adminApi.user(id) });
  const orders = useQuery({
    queryKey: ['admin', 'user-orders', id],
    queryFn: () => adminApi.userOrders(id),
  });

  const update = useMutation({
    mutationFn: (
      action: { status: AdminUser['status'] } | { role: AdminUser['role'] } | { unlock: true },
    ) =>
      'status' in action
        ? adminApi.setUserStatus(id, action.status)
        : 'role' in action
          ? adminApi.setUserRole(id, action.role)
          : adminApi.unlockUser(id),
    onSuccess: (_saved, action) => {
      void client.invalidateQueries({ queryKey: ['admin', 'user', id] });
      void client.invalidateQueries({ queryKey: ['admin', 'users'] });
      setNotice({
        tone: 'success',
        text:
          'status' in action
            ? t('statusChanged')
            : 'role' in action
              ? t('roleChanged')
              : t('unlocked'),
      });
    },
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 403
            ? t('roleForbidden')
            : tc('error'),
      }),
  });

  const data = user.data;
  const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeZone: 'Asia/Bishkek' });
  const isMe = me?.id === id;

  return (
    <>
      <PageHeader title={data?.email ?? ''} />
      <ListState error={user.isError} loading={user.isLoading} />
      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
            <section className="card p-5 text-sm">
              <p className="font-semibold">
                {[data.firstName, data.lastName].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-ink/70">{data.phone}</p>
              <p className="mt-2 text-xs text-muted">
                {t('registered', { date: date.format(new Date(data.createdAt)) })} ·{' '}
                {data.emailVerified ? t('verified') : t('notVerified')}
                {data.googleLinked && ` · ${t('google')}`}
              </p>
              {data.stats && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="user-stats">
                  <li>{t('paidOrders', { count: data.stats.paidOrdersCount })}</li>
                  <li>{t('spent', { sum: formatPrice(data.stats.totalSpent) })}</li>
                  <li>{t('audiobooks', { count: data.stats.audiobooksCount })}</li>
                  <li>{t('reviews', { count: data.stats.reviewsCount })}</li>
                </ul>
              )}
            </section>
            <section className="card p-5">
              <h2 className="font-medium text-cocoa">{t('userOrders')}</h2>
              {orders.data && orders.data.data.length === 0 && (
                <p className="mt-2 text-sm text-muted">{t('noOrders')}</p>
              )}
              <ul className="mt-3 space-y-2 text-sm">
                {orders.data?.data.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="flex-1 font-semibold underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <OrderStatusPill status={order.status} />
                    <span>{formatPrice(order.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="card h-fit space-y-3 p-5 text-sm" data-testid="user-actions">
            <p>
              {t('role')}: <strong>{t(`roles.${data.role}`)}</strong> · {t('status')}:{' '}
              <strong>{t(`statuses.${data.status}`)}</strong>
            </p>
            {isMe ? (
              <p className="text-muted">{t('self')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() =>
                      window.confirm(t('banConfirm', { email: data.email })) &&
                      update.mutate({ status: 'BANNED' })
                    }
                  >
                    {t('ban')}
                  </Button>
                ) : (
                  <Button
                    disabled={update.isPending}
                    onClick={() => update.mutate({ status: 'ACTIVE' })}
                  >
                    {t('activate')}
                  </Button>
                )}
                {data.isLocked && (
                  <Button
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ unlock: true })}
                  >
                    {t('unlock')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ role: data.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                >
                  {data.role === 'ADMIN' ? t('makeUser') : t('makeAdmin')}
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
