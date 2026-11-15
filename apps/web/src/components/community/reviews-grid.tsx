import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { LatestReview } from '@/lib/types';
import { ReportButton } from '../product/report-button';

/** Лента отзывов на странице «Сообщество» (с жалобой на отзыв). */
export async function ReviewsGrid({ reviews }: { reviews: LatestReview[] }) {
  const t = await getTranslations('reviews');
  const tc = await getTranslations('communityPage');
  if (reviews.length === 0)
    return <p className="card p-8 text-center text-sm text-muted">{tc('reviewsEmpty')}</p>;
  return (
    <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3" data-testid="community-reviews">
      {reviews.map((review) => (
        <li key={review.id} className="card mb-4 break-inside-avoid p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">{review.author.name}</span>
            <span
              className="text-xs tracking-[0.15em] text-gold"
              role="img"
              aria-label={t('rating', { rating: review.rating })}
            >
              {'★'.repeat(review.rating)}
              <span className="text-sand">{'★'.repeat(5 - review.rating)}</span>
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink/85">
            {review.text}
          </p>
          {review.product && (
            <Link
              href={`/${review.product.type === 'BOOK' ? 'books' : 'audiobooks'}/${review.product.slug}`}
              className="mt-3 block text-xs text-muted hover:text-cocoa"
            >
              {t('about', { title: review.product.title })}
              {review.isVerifiedPurchase && (
                <span className="ml-2 rounded-full bg-cocoa-100 px-2 py-0.5 text-[0.65rem] text-cocoa-500">
                  {t('verified')}
                </span>
              )}
            </Link>
          )}
          <ReportButton reviewId={review.id} />
        </li>
      ))}
    </ul>
  );
}
