'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inputClass, ListState, PageHeader, Pager } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/admin-api';

/** Модерация отзывов: скрыть, вернуть, удалить; фильтр по жалобам и статусу. */
export default function AdminReviewsPage() {
  const t = useTranslations('admin.reviewsAdmin');
  const tf = useTranslations('admin.filters');
  const client = useQueryClient();
  const [reported, setReported] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const reviews = useQuery({
    queryKey: ['admin', 'reviews', reported, status, page],
    queryFn: () =>
      adminApi.reviews({ page, reported: reported || undefined, status: status || undefined }),
  });
  const refresh = () => void client.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      adminApi.moderateReview(id, status),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: refresh,
  });
  const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeZone: 'Asia/Bishkek' });

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reported}
            onChange={(e) => {
              setReported(e.target.checked);
              setPage(1);
            }}
            className="size-4 accent-[#3a2416]"
          />
          {t('onlyReported')}
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label={t('statusFilter')}
          className={`${inputClass} mt-0 sm:w-56`}
        >
          <option value="">
            {t('statusFilter')}: {tf('all')}
          </option>
          <option value="APPROVED">{t('statuses.APPROVED')}</option>
          <option value="REJECTED">{t('statuses.REJECTED')}</option>
        </select>
      </div>
      <ListState error={reviews.isError} loading={reviews.isLoading} />
      {reviews.data &&
        (reviews.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {reviews.data.data.map((review) => {
                const product = review.book ?? review.audiobook;
                return (
                  <li
                    key={review.id}
                    className={`card p-4 text-sm ${review.status === 'REJECTED' ? 'opacity-70' : ''}`}
                    data-testid="admin-review"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gold">
                        {'★'.repeat(review.rating)}
                        <span className="text-sand">{'★'.repeat(5 - review.rating)}</span>
                      </span>
                      <span className="font-semibold">{review.user.email}</span>
                      <span className="text-xs text-muted">
                        {date.format(new Date(review.createdAt))}
                      </span>
                      {product && (
                        <Link
                          href={`/${review.book ? 'books' : 'audiobooks'}/${product.slug}`}
                          target="_blank"
                          className="text-xs underline"
                        >
                          {product.title}
                        </Link>
                      )}
                      <span className="rounded-full bg-sand/60 px-2 py-0.5 text-xs">
                        {t(`statuses.${review.status}`)}
                      </span>
                      {review.reportsCount > 0 && (
                        <span className="rounded-full bg-[#a3412c]/15 px-2 py-0.5 text-xs font-semibold text-[#8a3524]">
                          {t('reports', { count: review.reportsCount })}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-ink/85">
                      {review.text || <em className="text-muted">{t('noText')}</em>}
                    </p>
                    {review.reports.filter((report) => report.reason).length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-[#8a3524]">
                        {review.reports
                          .filter((report) => report.reason)
                          .map((report, index) => (
                            <li key={index}>{report.reason}</li>
                          ))}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-4 text-xs font-semibold">
                      {review.status === 'REJECTED' ? (
                        <button
                          type="button"
                          className="text-cocoa underline"
                          onClick={() => moderate.mutate({ id: review.id, status: 'APPROVED' })}
                        >
                          {t('show')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-cocoa underline"
                          onClick={() => moderate.mutate({ id: review.id, status: 'REJECTED' })}
                        >
                          {t('hide')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-[#8a3524] underline"
                        onClick={() =>
                          window.confirm(t('deleteConfirm')) && remove.mutate(review.id)
                        }
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} totalPages={reviews.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
