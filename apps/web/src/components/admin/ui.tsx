'use client';

import { useTranslations } from 'next-intl';
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
