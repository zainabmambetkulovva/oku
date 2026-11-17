'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  inputClass,
  ListState,
  OrderStatusPill,
  PageHeader,
  Pager,
  useDebounced,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

/** Заказы: поиск, фильтры по статусу, оплате, доставке, датам и платежам на проверке. */
export default function AdminOrdersPage() {
  const t = useTranslations('admin.ordersAdmin');
  const tf = useTranslations('admin.filters');
  const ts = useTranslations('admin.orderStatus');
  const td = useTranslations('pages.delivery');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    paymentMethod: '',
    deliveryMethod: '',
    from: '',
    to: '',
    requiresReview: false,
  });
  const [page, setPage] = useState(1);
  const query = useDebounced(search.trim());
  const set = (patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const orders = useQuery({
    queryKey: ['admin', 'orders', query, filters, page],
    queryFn: () =>
      adminApi.orders({
        page,
        search: query || undefined,
        status: filters.status || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        deliveryMethod: filters.deliveryMethod || undefined,
        from: filters.from ? new Date(`${filters.from}T00:00:00+06:00`).toISOString() : undefined,
        to: filters.to ? new Date(`${filters.to}T23:59:59+06:00`).toISOString() : undefined,
        requiresReview: filters.requiresReview || undefined,
      }),
  });
  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Bishkek',
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t('search')}
          aria-label={t('search')}
          className={`${inputClass} mt-0 lg:col-span-2`}
        />
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-label={t('status')}
          className={`${inputClass} mt-0`}
        >
          <option value="">
            {t('status')}: {tf('all')}
          </option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {ts(status)}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentMethod}
          onChange={(e) => set({ paymentMethod: e.target.value })}
          aria-label={t('payment')}
          className={`${inputClass} mt-0`}
        >
          <option value="">
            {t('payment')}: {tf('all')}
          </option>
          <option value="ONLINE">{t('paymentMethod.ONLINE')}</option>
          <option value="CASH">{t('paymentMethod.CASH')}</option>
        </select>
        <select
          value={filters.deliveryMethod}
          onChange={(e) => set({ deliveryMethod: e.target.value })}
          aria-label={t('delivery')}
          className={`${inputClass} mt-0`}
        >
          <option value="">
            {t('delivery')}: {tf('all')}
          </option>
          {(['PICKUP', 'COURIER', 'POST'] as const).map((method) => (
            <option key={method} value={method}>
              {td(`method.${method}`)}
            </option>
          ))}
        </select>
        <label className="text-xs text-muted">
          {tf('from')}
          <input
            type="date"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-xs text-muted">
          {tf('to')}
          <input
            type="date"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.requiresReview}
            onChange={(e) => set({ requiresReview: e.target.checked })}
            className="size-4 accent-[#3a2416]"
          />
          {t('needsReview')}
        </label>
      </div>

      <ListState error={orders.isError} loading={orders.isLoading} />
      {orders.data &&
        (orders.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <ul className="space-y-3" data-testid="admin-orders">
              {orders.data.data.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="card lift flex flex-wrap items-center gap-3 p-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{order.orderNumber}</span>
                      <span className="block truncate text-xs text-muted">
                        {date.format(new Date(order.createdAt))} · {order.customer.email} ·{' '}
                        {order.recipientPhone}
                      </span>
                    </span>
                    <span className="text-xs text-ink/70">
                      {t(`paymentMethod.${order.paymentMethod}`)}
                      {order.deliveryMethod && ` · ${td(`method.${order.deliveryMethod}`)}`}
                    </span>
                    <OrderStatusPill status={order.status} />
                    {order.payments.some((payment) => payment.requiresReview) && (
                      <span className="rounded-full bg-[#a3412c]/15 px-2 py-0.5 text-xs font-semibold text-[#8a3524]">
                        {t('reviewFlag')}
                      </span>
                    )}
                    <span className="w-24 text-right font-semibold text-cocoa">
                      {formatPrice(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={orders.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
