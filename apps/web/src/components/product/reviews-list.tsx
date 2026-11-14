'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { apiFetchPage } from '@/lib/api';
import type { ReviewItem } from '@/lib/types';

/** Список отзывов с кнопкой «Показать ещё». */
export function ReviewsList({
  kind,
  slug,
  initial,
  total,
}: {
  kind: 'books' | 'audiobooks';
  slug: string;
  initial: ReviewItem[];
  total: number;
}) {
  const t = useTranslations('reviewsBlock');
  const locale = useLocale();
  const [reviews, setReviews] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  if (reviews.length === 0) return <p className="card p-6 text-sm text-ink/70">{t('none')}</p>;

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#e7cfa3] to-[#c49a5e] text-sm font-semibold text-white"
                  aria-hidden="true"
                >
                  {review.author.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-ink">{review.author.name}</span>
                {review.isVerifiedPurchase && (
                  <span className="rounded-full bg-cocoa-100 px-2 py-0.5 text-[0.65rem] text-cocoa-500">
                    {t('verified')}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted">
                {new Date(review.createdAt).toLocaleDateString(locale === 'ky' ? 'ky-KG' : 'ru-RU')}
              </span>
            </div>
            <p
              className="mt-2 text-sm tracking-[0.15em] text-gold"
              role="img"
              aria-label={`${review.rating} / 5`}
            >
              {'★'.repeat(review.rating)}
              <span className="text-sand">{'★'.repeat(5 - review.rating)}</span>
            </p>
            {review.text && (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink/85">
                {review.text}
              </p>
            )}
          </li>
        ))}
      </ul>
      {reviews.length < total && (
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const next = await apiFetchPage<ReviewItem>(
                `/${kind}/${slug}/reviews?limit=6&page=${page + 1}`,
              );
              setReviews((current) => [...current, ...next.data]);
              setPage(page + 1);
            } finally {
              setLoading(false);
            }
          }}
          className="w-full rounded-full border border-sand bg-white/60 py-3 text-sm font-semibold text-cocoa hover:bg-white"
        >
          {t('more')}
        </button>
      )}
    </div>
  );
}
