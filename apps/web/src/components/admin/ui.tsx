'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { ProductStatus } from '@/lib/admin-api';

/** Заголовок страницы админки с действием справа. */
export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-[1.9rem] font-medium text-cocoa">{title}</h1>
      {action}
    </div>
  );
}

const STATUS_STYLE: Record<ProductStatus, string> = {
  ACTIVE: 'bg-[#e3ecd5] text-[#3f5a24]',
  DRAFT: 'bg-[#f3e1cf] text-cocoa-500',
  ARCHIVED: 'bg-[#ead8d2] text-[#7a3f33]',
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const t = useTranslations('admin.status');
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {t(status)}
    </span>
  );
}

/** Сообщение под формой: успех или ошибка, озвучивается экранным диктором. */
export function Notice({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm ${tone === 'error' ? 'bg-[#a3412c]/10 text-[#8a3524]' : 'bg-[#e3ecd5] text-[#3f5a24]'}`}
    >
      {children}
    </p>
  );
}

export const inputClass =
  'mt-1.5 w-full rounded-2xl border border-sand bg-white/80 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 aria-[invalid=true]:border-[#a3412c]';

export function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-ink/85 ${className}`}>
      {label}
      {children}
      {error && <span className="mt-1 block text-xs text-[#a3412c]">{error}</span>}
    </label>
  );
}

/** Переключатель страниц списка. */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const t = useTranslations('admin.common');
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="font-semibold disabled:opacity-40"
      >
        ← {t('prev')}
      </button>
      <span>{t('page', { page, total: totalPages })}</span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="font-semibold disabled:opacity-40"
      >
        {t('next')} →
      </button>
    </div>
  );
}

const ORDER_STYLE: Record<string, string> = {
  PENDING: 'bg-[#f6e3c3] text-[#7a4a12]',
  PAID: 'bg-[#e3ecd5] text-[#3f5a24]',
  PROCESSING: 'bg-[#dfe7f1] text-[#2c4a6b]',
  SHIPPED: 'bg-[#dfe7f1] text-[#2c4a6b]',
  COMPLETED: 'bg-[#e3ecd5] text-[#3f5a24]',
  CANCELLED: 'bg-sand/60 text-ink/70',
  REFUNDED: 'bg-sand/60 text-ink/70',
};

export function OrderStatusPill({ status }: { status: string }) {
  const t = useTranslations('admin.orderStatus');
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STYLE[status] ?? ''}`}
      data-testid="admin-order-status"
    >
      {t(status)}
    </span>
  );
}

/** Состояние загрузки или ошибки списка. */
export function ListState({ error, loading }: { error: boolean; loading: boolean }) {
  const t = useTranslations('admin.common');
  if (error) return <p className="card p-8 text-center text-sm text-muted">{t('error')}</p>;
  if (loading)
    return (
      <p className="text-sm text-muted" role="status">
        {t('loading')}
      </p>
    );
  return null;
}

/** Задержка ввода поиска. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
