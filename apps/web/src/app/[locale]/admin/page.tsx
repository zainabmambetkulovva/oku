'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/admin/ui';
import { SalesChart } from '@/components/admin/sales-chart';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card lift p-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-cocoa">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Обзор: выручка, заказы, покупатели, книги, график продаж, последние заказы, остатки. */
export default function DashboardPage() {
  const t = useTranslations('admin.dashboard');
  const tc = useTranslations('admin.common');
  const ts = useTranslations('admin.orderStatus');
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard });
  const sales = useQuery({ queryKey: ['admin', 'sales'], queryFn: adminApi.sales });

  if (dashboard.isError) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">{tc('error')}</p>
        <button
          type="button"
          onClick={() => dashboard.refetch()}
          className="mt-3 text-sm font-semibold underline"
        >
          {tc('retry')}
        </button>
      </div>
    );
  }
  const data = dashboard.data;

  return (
    <>
      <PageHeader title={t('title')} />
      {!data ? (
        <p className="text-sm text-muted" role="status">
          {tc('loading')}
        </p>
      ) : (
        <div className="space-y-6">
          {data.alerts.paymentsToReview > 0 && (
            <p className="rounded-2xl bg-[#f6e3c4] px-4 py-3 text-sm text-cocoa">
              {t('paymentsToReview', { count: data.alerts.paymentsToReview })}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t('revenue30')}
              value={formatPrice(data.sales.revenueLast30Days)}
              hint={`${t('revenueTotal')}: ${formatPrice(data.sales.totalRevenue)}`}
            />
            <Stat label={t('orders')} value={String(data.orders.total)} />
            <Stat
              label={t('users')}
              value={String(data.users.total)}
              hint={t('newUsers', { count: data.users.newLast30Days })}
            />
            <Stat
              label={t('books')}
              value={String(data.books.active)}
              hint={t('booksOf', { total: data.books.total })}
            />
          </div>
          {sales.data && <SalesChart data={sales.data} title={t('sales')} empty={t('noSales')} />}
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="card p-5">
              <h2 className="text-lg font-medium text-cocoa">{t('recentOrders')}</h2>
              {data.recentOrders.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t('noOrders')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-sand/60">
                  {data.recentOrders.map((order) => (
                    <li
                      key={order.orderNumber}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{order.orderNumber}</span>
                        <span className="ml-2 text-muted">{order.recipientName}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="rounded-full bg-cocoa-100 px-2.5 py-0.5 text-xs">
                          {ts(order.status)}
                        </span>
                        <span className="font-semibold text-cocoa">{formatPrice(order.total)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card p-5">
              <h2 className="text-lg font-medium text-cocoa">{t('lowStock')}</h2>
              {data.alerts.lowStockBooks.length === 0 ? (
                <p className="mt-4 text-sm text-muted">{t('noLowStock')}</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {data.alerts.lowStockBooks.map((book) => (
                    <li key={book.id} className="flex justify-between gap-3">
                      <Link href={`/admin/books/${book.id}`} className="truncate hover:underline">
                        {book.title}
                      </Link>
                      <span className="shrink-0 text-[#8a3524]">
                        {t('stockLeft', { count: book.stockQuantity })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
