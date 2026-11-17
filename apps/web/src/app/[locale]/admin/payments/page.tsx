'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inputClass, ListState, Notice, PageHeader, Pager } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminApi, type AdminPayment } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';

function ResolveForm({ payment, onDone }: { payment: AdminPayment; onDone: () => void }) {
  const t = useTranslations('admin.paymentsAdmin');
  const tc = useTranslations('admin.common');
  const client = useQueryClient();
  const [note, setNote] = useState('');
  const [refunded, setRefunded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolve = useMutation({
    mutationFn: () => adminApi.resolvePayment(payment.id, refunded, note.trim()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'payments'] });
      onDone();
    },
    onError: () => setError(tc('error')),
  });
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!note.trim()) return setError(t('noteRequired'));
        resolve.mutate();
      }}
    >
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder={t('note')}
        aria-label={t('note')}
        className={inputClass}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={refunded}
          onChange={(e) => setRefunded(e.target.checked)}
          className="size-4 accent-[#3a2416]"
        />
        {t('refunded')}
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={resolve.isPending}>
        {t('save')}
      </Button>
    </form>
  );
}

/** Платежи; по умолчанию — требующие ручного разбора (сумма не совпала и т.п.). */
export default function AdminPaymentsPage() {
  const t = useTranslations('admin.paymentsAdmin');
  const [onlyReview, setOnlyReview] = useState(true);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const payments = useQuery({
    queryKey: ['admin', 'payments', onlyReview, page],
    queryFn: () => adminApi.payments({ page, requiresReview: onlyReview || undefined }),
  });
  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Bishkek',
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyReview}
          onChange={(e) => {
            setOnlyReview(e.target.checked);
            setPage(1);
          }}
          className="size-4 accent-[#3a2416]"
        />
        {t('onlyReview')}
      </label>
      {message && <Notice tone="success">{message}</Notice>}
      <ListState error={payments.isError} loading={payments.isLoading} />
      {payments.data &&
        (payments.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {payments.data.data.map((payment) => (
                <li key={payment.id} className="card p-4 text-sm" data-testid="admin-payment">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex-1">
                      {payment.order && (
                        <Link
                          href={`/admin/orders/${payment.order.orderNumber}`}
                          className="font-semibold underline"
                        >
                          {payment.order.orderNumber}
                        </Link>
                      )}
                      <span className="block text-xs text-muted">
                        {date.format(new Date(payment.createdAt))} · {payment.provider} ·{' '}
                        {t(`status.${payment.status}`)}
                      </span>
                      {payment.reviewReason && (
                        <span className="block text-xs text-[#8a3524]">
                          {t('reason')}: {payment.reviewReason}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">{formatPrice(payment.amount)}</span>
                    {payment.requiresReview && open !== payment.id && (
                      <Button variant="outline" onClick={() => setOpen(payment.id)}>
                        {t('resolve')}
                      </Button>
                    )}
                  </div>
                  {open === payment.id && (
                    <ResolveForm
                      payment={payment}
                      onDone={() => {
                        setOpen(null);
                        setMessage(t('resolved'));
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={payments.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
