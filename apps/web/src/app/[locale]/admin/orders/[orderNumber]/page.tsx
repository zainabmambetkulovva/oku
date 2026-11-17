'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inputClass, ListState, Notice, OrderStatusPill, PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { adminApi, type AdminOrder } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';
import { PICKUP } from '@/lib/site';

type Action = 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUND';

/** Какие действия доступны для заказа (сервер всё равно проверяет переходы). */
export function availableActions(
  order: Pick<AdminOrder, 'status' | 'paymentMethod' | 'deliveryMethod'>,
): Action[] {
  const shippable = order.deliveryMethod === 'COURIER' || order.deliveryMethod === 'POST';
  switch (order.status) {
    case 'PENDING':
      return order.paymentMethod === 'CASH' ? ['PROCESSING', 'CANCELLED'] : ['CANCELLED'];
    case 'PAID':
      return ['PROCESSING', 'COMPLETED', 'REFUND'];
    case 'PROCESSING':
      return [
        ...(shippable ? (['SHIPPED'] as Action[]) : []),
        'COMPLETED',
        ...(order.paymentMethod === 'CASH'
          ? (['CANCELLED'] as Action[])
          : (['REFUND'] as Action[])),
      ];
    case 'SHIPPED':
      return ['COMPLETED', ...(order.paymentMethod === 'ONLINE' ? (['REFUND'] as Action[]) : [])];
    case 'COMPLETED':
      return ['REFUND'];
    default:
      return [];
  }
}

/** Системные комментарии API (на английском) — на языке админки. */
function useSystemComment() {
  const t = useTranslations('admin.ordersAdmin.systemComments');
  return (comment: string) => {
    const paid = /^Paid via (.+)$/.exec(comment);
    if (paid) return t('paidVia', { provider: paid[1] === 'finik' ? 'Finik' : paid[1] });
    if (comment === 'Digital order: access granted') return t('digital');
    if (comment === 'Payment time expired') return t('expired');
    if (comment === 'Cancelled by customer') return t('byCustomer');
    return comment;
  };
}

const ACTION_LABEL: Record<Action, string> = {
  PROCESSING: 'toProcessing',
  SHIPPED: 'toShipped',
  COMPLETED: 'toCompleted',
  CANCELLED: 'toCancelled',
  REFUND: 'refund',
};

export default function AdminOrderPage() {
  const t = useTranslations('admin.ordersAdmin');
  const tp = useTranslations('admin.paymentsAdmin');
  const td = useTranslations('pages.delivery');
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const systemComment = useSystemComment();
  const client = useQueryClient();
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const order = useQuery({
    queryKey: ['admin', 'order', orderNumber],
    queryFn: () => adminApi.order(orderNumber),
  });

  const act = useMutation({
    mutationFn: (action: Action) =>
      action === 'REFUND'
        ? adminApi.refundOrder(orderNumber, comment)
        : adminApi.setOrderStatus(orderNumber, action, comment),
    onSuccess: (saved) => {
      client.setQueryData(['admin', 'order', orderNumber], saved);
      void client.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setComment('');
      setNotice({ tone: 'success', text: t('done') });
    },
    onError: (caught) => {
      const message = caught instanceof ApiRequestError ? String(caught.body?.message ?? '') : '';
      const key = /not paid/i.test(message)
        ? 'onlineUnpaid'
        : /shipped/i.test(message)
          ? 'shippedOnly'
          : /refund it/i.test(message)
            ? 'paidCancel'
            : 'failed';
      setNotice({ tone: 'error', text: t(key) });
    },
  });

  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Bishkek',
  });
  const data = order.data;

  return (
    <>
      <PageHeader title={orderNumber} action={data && <OrderStatusPill status={data.status} />} />
      <ListState error={order.isError} loading={order.isLoading} />
      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
            <section className="card space-y-3 p-5" data-testid="order-actions">
              <h2 className="font-medium text-cocoa">{t('actions')}</h2>
              {availableActions(data).length === 0 ? (
                <p className="text-sm text-muted">{t('noActions')}</p>
              ) : (
                <>
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    placeholder={t('actionComment')}
                    aria-label={t('actionComment')}
                    className={inputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    {availableActions(data).map((action) => (
                      <Button
                        key={action}
                        variant={
                          action === 'CANCELLED' || action === 'REFUND' ? 'outline' : 'primary'
                        }
                        disabled={act.isPending}
                        onClick={() => {
                          if (
                            action === 'CANCELLED' &&
                            !window.confirm(t('confirmCancel', { number: orderNumber }))
                          )
                            return;
                          if (
                            action === 'REFUND' &&
                            !window.confirm(t('confirmRefund', { number: orderNumber }))
                          )
                            return;
                          setNotice(null);
                          act.mutate(action);
                        }}
                      >
                        {t(ACTION_LABEL[action])}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="card p-5">
              <h2 className="font-medium text-cocoa">{t('items')}</h2>
              <ul className="mt-3 divide-y divide-sand/60 text-sm">
                {data.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {item.title} <span className="text-muted">— {item.author}</span>
                      <span className="block text-xs text-muted">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </span>
                    </span>
                    <span className="font-semibold">{formatPrice(item.totalPrice)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-sand pt-3 text-sm">
                <div className="flex justify-between">
                  <dt>{t('subtotal')}</dt>
                  <dd>{formatPrice(data.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('deliveryPrice')}</dt>
                  <dd>{formatPrice(data.deliveryPrice)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>{t('total')}</dt>
                  <dd>{formatPrice(data.total)}</dd>
                </div>
              </dl>
            </section>

            <section className="card p-5">
              <h2 className="font-medium text-cocoa">{t('history')}</h2>
              <ol className="mt-3 space-y-2 border-l-2 border-sand pl-4 text-sm">
                {data.statusHistory.map((entry, index) => (
                  <li key={index}>
                    <OrderStatusPill status={entry.newStatus} />
                    <span className="ml-2 text-xs text-muted">
                      {date.format(new Date(entry.createdAt))} ·{' '}
                      {entry.changedBy ? t('by', { email: entry.changedBy.email }) : t('system')}
                    </span>
                    {entry.comment && (
                      <p className="mt-1 text-xs text-ink/75">{systemComment(entry.comment)}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {data.payments.length > 0 && (
              <section className="card p-5">
                <h2 className="font-medium text-cocoa">{t('payments')}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {payment.provider} · {tp(`status.${payment.status}`)}
                        {payment.paidAt &&
                          ` · ${t('paidAt', { date: date.format(new Date(payment.paidAt)) })}`}
                        {payment.requiresReview && (
                          <span className="ml-2 text-xs font-semibold text-[#8a3524]">
                            {t('reviewFlag')}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">{formatPrice(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="card h-fit space-y-4 p-5 text-sm">
            <div>
              <p className="text-xs font-semibold text-gold-dark uppercase">{t('customer')}</p>
              <Link href={`/admin/users/${data.customer.id}`} className="font-semibold underline">
                {data.customer.email}
              </Link>
              <p className="text-ink/70">
                {[data.customer.firstName, data.customer.lastName].filter(Boolean).join(' ')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gold-dark uppercase">{t('recipient')}</p>
              <p>{data.recipientName}</p>
              <a
                href={`tel:${data.recipientPhone.replace(/[^\d+]/g, '')}`}
                className="text-cocoa underline"
              >
                {data.recipientPhone}
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold text-gold-dark uppercase">{t('delivery')}</p>
              <p>{data.deliveryMethod ? td(`method.${data.deliveryMethod}`) : '—'}</p>
              {data.deliveryMethod === 'PICKUP' && (
                <p className="text-ink/70">Бишкек, проспект Чуй 394 · {PICKUP.hours}</p>
              )}
              {data.deliveryAddress && <p className="text-ink/70">{data.deliveryAddress}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gold-dark uppercase">{t('payment')}</p>
              <p>{t(`paymentMethod.${data.paymentMethod}`)}</p>
              {data.status === 'PENDING' && data.expiresAt && (
                <p className="text-ink/70">
                  {t('expires', { date: date.format(new Date(data.expiresAt)) })}
                </p>
              )}
            </div>
            {data.comment && (
              <div>
                <p className="text-xs font-semibold text-gold-dark uppercase">{t('comment')}</p>
                <p className="whitespace-pre-line">{data.comment}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
