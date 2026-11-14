import { getTranslations } from 'next-intl/server';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type { ReviewItem, ReviewSummary } from '@/lib/types';
import { ReviewForm } from './review-form';
import { ReviewsList } from './reviews-list';

/** Отзывы товара: средняя оценка с распределением, список (с подгрузкой) и форма. */
export async function ReviewsBlock({ kind, slug }: { kind: 'books' | 'audiobooks'; slug: string }) {
  const t = await getTranslations('reviewsBlock');
  const empty = { data: [] as ReviewItem[], meta: { total: 0, page: 1, limit: 6, totalPages: 0 } };
  const [summary, reviews] = await Promise.all([
    safely(
      () => apiFetch<ReviewSummary>(`/${kind}/${slug}/reviews/summary`),
      null,
      'review summary',
    ),
    safely(() => apiFetchPage<ReviewItem>(`/${kind}/${slug}/reviews?limit=6`), empty, 'reviews'),
  ]);

  return (
    <section
      id="reviews"
      className="scroll-mt-24"
      aria-labelledby="reviews-heading"
      data-testid="reviews"
    >
      <h2 id="reviews-heading" className="text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]">
        {t('title')}
      </h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            {summary && summary.count > 0 ? (
              <>
                <p className="font-display text-4xl text-cocoa">
                  {summary.average?.toFixed(1)}{' '}
                  <span className="text-base text-muted">{t('outOf')}</span>
                </p>
                <p className="mt-1 text-sm text-ink/70">{t('count', { count: summary.count })}</p>
                <ul className="mt-4 space-y-1.5">
                  {(['5', '4', '3', '2', '1'] as const).map((star) => (
                    <li key={star} className="flex items-center gap-2 text-xs text-ink/70">
                      <span className="w-6">{star}★</span>
                      <span className="h-1.5 flex-1 rounded-full bg-sand/50">
                        <span
                          className="block h-1.5 rounded-full bg-gold"
                          style={{
                            width: `${(summary.distribution[star] / summary.count) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="w-6 text-right">{summary.distribution[star]}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-ink/70">{t('none')}</p>
            )}
          </div>
          <ReviewForm kind={kind} slug={slug} />
        </div>
        <ReviewsList kind={kind} slug={slug} initial={reviews.data} total={reviews.meta.total} />
      </div>
    </section>
  );
}
