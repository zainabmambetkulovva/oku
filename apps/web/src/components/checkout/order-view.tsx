'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { authFetch, useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { PICKUP, SITE_CONTACTS } from '@/lib/site';
import type { OrderDetails, PaymentSession } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { FormAlert } from '../auth/auth-card';
import { Button, buttonClasses } from '../ui/button';

/** Сколько ждать подтверждения оплаты от Finik после возврата со страницы оплаты. */
const POLL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;

const STATUS_STYLE: Record<OrderDetails['status'], string> = {
  PENDING: 'bg-[#f6e3c3] text-[#7a4a12]',
  PAID: 'bg-[#e3ecd5] text-[#3f5a24]',
  PROCESSING: 'bg-[#e3ecd5] text-[#3f5a24]',
  SHIPPED: 'bg-[#dfe7f1] text-[#2c4a6b]',
  COMPLETED: 'bg-[#e3ecd5] text-[#3f5a24]',
  CANCELLED: 'bg-sand/60 text-ink/70',
  REFUNDED: 'bg-sand/60 text-ink/70',
};

function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, new Date(deadline).getTime() - now);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return { left, label: `${minutes}:${String(seconds).padStart(2, '0')}` };
}

/**
 * Страница заказа. Статус оплаты берётся только с сервера: заказ считается
 * оплаченным, когда API получил подтверждение от Finik. После возврата со страницы
 * оплаты страница сама опрашивает API, пока статус не изменится.
 */
export function OrderView({ orderNumber }: { orderNumber: string }) {
  const t = useTranslations('orderPage');
  const ta = useTranslations('auth');
  const td = useTranslations('pages.delivery');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const returnedFromPayment = params.has('payment');
  const status = useAuth((state) => state.status);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [missing, setMissing] = useState(false);
  const [polling, setPolling] = useState(returnedFromPayment);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<'paymentStartFailed' | null>(
    params.has('paymentError') ? 'paymentStartFailed' : null,
  );
  const pollStarted = useRef(Date.now());

  const load = useCallback(async () => {
    try {
      const fresh = await authFetch<OrderDetails>(`/orders/${encodeURIComponent(orderNumber)}`);
      setOrder(fresh);
      return fresh;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) setMissing(true);
      return null;
    }
  }, [orderNumber]);

  useEffect(() => {
    if (status === 'authenticated') void load();
  }, [status, load]);

  // Ждём подтверждения оплаты: не дольше двух минут
  useEffect(() => {
    if (!polling || status !== 'authenticated') return;
    const timer = setInterval(async () => {
      const fresh = await load();
      const lastPayment = fresh?.payments.at(-1);
      const settled =
        fresh && (fresh.status !== 'PENDING' || (lastPayment && lastPayment.status !== 'PENDING'));
      if (settled || Date.now() - pollStarted.current > POLL_LIMIT_MS) {
        setPolling(false);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [polling, status, load]);

  const countdown = useCountdown(
    order?.status === 'PENDING' && order.paymentMethod === 'ONLINE' ? order.expiresAt : null,
  );

  if (status === 'guest') {
    return (
      <div className="card mt-8 max-w-xl p-8">
        <p className="text-sm">{t('signIn')}</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className={buttonClasses('primary', 'mt-5')}
        >
          {ta('toLogin')}
        </Link>
      </div>
    );
  }
  if (missing) return <p className="card mt-8 p-8 text-sm">{t('notFound')}</p>;
  if (!order) return <p className="mt-8 animate-pulse text-sm text-muted">{t('loading')}</p>;

  const dateFormat = new Intl.DateTimeFormat(locale === 'ky' ? 'ky-KG' : 'ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Bishkek',
  });
  const isDigital = order.items.every((item) => item.productType === 'AUDIOBOOK');
  const isCash = order.paymentMethod === 'CASH';
  const lastPayment = order.payments.at(-1);
  const expired =
    order.status === 'CANCELLED' &&
    order.statusHistory.some((entry) => entry.comment === 'Payment time expired');
  const awaitingOnline = order.status === 'PENDING' && !isCash;
  const canPay = awaitingOnline && countdown !== null && countdown.left > 0;

  const statusKey =
    order.status === 'PENDING' && isCash
      ? 'PENDING_CASH'
      : order.status === 'COMPLETED' && isDigital
        ? 'COMPLETED_DIGITAL'
        : order.status === 'CANCELLED' && expired
          ? 'CANCELLED_EXPIRED'
          : order.status;
  const badgeKey = order.status === 'PENDING' && isCash ? 'PENDING_CASH' : order.status;
  const time = order.expiresAt
    ? new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bishkek',
      }).format(new Date(order.expiresAt))
    : '';

  const pay = async () => {
    setPaying(true);
    setNotice(null);
    try {
      const session = await authFetch<PaymentSession>(
        `/orders/${encodeURIComponent(order.orderNumber)}/payments`,
        { method: 'POST' },
      );
      window.location.assign(session.paymentUrl);
    } catch {
      setNotice('paymentStartFailed');
      setPaying(false);
      void load();
    }
  };

  const cancel = async () => {
    if (!window.confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try {
      setOrder(
        await authFetch<OrderDetails>(`/orders/${encodeURIComponent(order.orderNumber)}/cancel`, {
          method: 'POST',
        }),
      );
    } catch {
      void load();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" data-testid="order-view">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}
              data-testid="order-status"
            >
              {t(`status.${badgeKey}`)}
            </span>
            <span className="text-xs text-muted">
              {t('created', { date: dateFormat.format(new Date(order.createdAt)) })}
            </span>
          </div>
          <p className="text-sm text-ink/85" data-testid="order-status-text">
            {t(`statusText.${statusKey}`, { time })}
          </p>

          {awaitingOnline && polling && (
            <p
              role="status"
              className="animate-pulse rounded-2xl bg-cocoa-100 px-4 py-3 text-sm text-cocoa"
            >
              {t('checking')}
            </p>
          )}
          {awaitingOnline &&
            !polling &&
            returnedFromPayment &&
            lastPayment?.status === 'PENDING' && (
              <FormAlert tone="info">{t('notConfirmed')}</FormAlert>
            )}
          {awaitingOnline &&
            (lastPayment?.status === 'FAILED' || lastPayment?.status === 'CANCELLED') && (
              <FormAlert>{t('paymentFailed')}</FormAlert>
            )}
          {notice && <FormAlert>{t(notice)}</FormAlert>}

          {order.status === 'PENDING' && (
            <div className="flex flex-wrap items-center gap-3">
              {canPay && (
                <>
                  <Button onClick={() => void pay()} disabled={paying} data-testid="pay">
                    {paying ? t('paying') : t('pay', { amount: formatPrice(order.total) })}
                  </Button>
                  <span className="text-sm font-semibold text-[#7a4a12]" data-testid="countdown">
                    {t('timeLeft', { time: countdown.label })}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => void cancel()}
                disabled={cancelling}
                className="text-sm font-semibold text-[#8a3524] underline-offset-2 hover:underline"
              >
                {cancelling ? t('cancelling') : t('cancel')}
              </button>
            </div>
          )}
        </section>

        <section className="card p-6" aria-labelledby="order-items">
          <h2 id="order-items" className="font-display text-xl text-cocoa">
            {t('items')}
          </h2>
          <ul className="mt-4 divide-y divide-sand/60">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <span className="w-12 shrink-0">
                  <BookCover
                    slug={item.id}
                    title={item.title}
                    author={item.author}
                    coverUrl={item.coverUrl}
                    square={item.productType === 'AUDIOBOOK'}
                  />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold text-ink">{item.title}</span>
                  <span className="text-xs text-muted">
                    {item.author} · {t('quantity', { count: item.quantity })}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {formatPrice(item.totalPrice)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {order.statusHistory.length > 1 && (
          <section className="card p-6" aria-labelledby="order-history">
            <h2 id="order-history" className="font-display text-xl text-cocoa">
              {t('history')}
            </h2>
            <ol className="mt-4 space-y-2 border-l-2 border-sand pl-4 text-sm">
              {order.statusHistory.map((entry, index) => (
                <li key={index}>
                  <span className="font-semibold">
                    {t(
                      `status.${entry.newStatus === 'PENDING' && isCash ? 'PENDING_CASH' : entry.newStatus}`,
                    )}
                  </span>
                  <span className="ml-2 text-xs text-muted">
                    {dateFormat.format(new Date(entry.createdAt))}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <aside className="card h-fit space-y-5 p-6 text-sm" data-testid="order-summary">
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink/75">{t('subtotal')}</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {order.deliveryMethod && (
            <div className="flex justify-between">
              <dt className="text-ink/75">{t('delivery')}</dt>
              <dd>{order.deliveryPrice === 0 ? t('free') : formatPrice(order.deliveryPrice)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-sand pt-3">
            <dt className="font-semibold">{t('total')}</dt>
            <dd className="font-display text-2xl text-cocoa" data-testid="order-total">
              {formatPrice(order.total)}
            </dd>
          </div>
        </dl>
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
            {t('recipient')}
          </p>
          <p className="mt-1">{order.recipientName}</p>
          <p className="text-ink/70">{order.recipientPhone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
            {t('deliveryInfo')}
          </p>
          <p className="mt-1">
            {order.deliveryMethod ? td(`method.${order.deliveryMethod}`) : t('digital')}
          </p>
          {order.deliveryMethod === 'PICKUP' && (
            <p className="text-ink/70">{t('pickupAddress', { hours: PICKUP.hours })}</p>
          )}
          {order.deliveryAddress && <p className="text-ink/70">{order.deliveryAddress}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
            {t('payment')}
          </p>
          <p className="mt-1">{t(`paymentMethod.${order.paymentMethod}`)}</p>
        </div>
        {order.comment && (
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
              {t('comment')}
            </p>
            <p className="mt-1 whitespace-pre-line text-ink/80">{order.comment}</p>
          </div>
        )}
        <a
          href={SITE_CONTACTS.whatsappUrl}
          target="_blank"
          rel="noopener"
          className="block text-xs font-semibold text-cocoa underline"
        >
          {t('help')}
        </a>
        <Link href="/books" className={buttonClasses('outline', 'w-full')}>
          {t('toCatalog')}
        </Link>
      </aside>
    </div>
  );
}
