import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { BookListItem, LatestReview } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { LeafBranch, Sparkle } from '../ornaments/decor';
import Image from 'next/image';
import { ArrowRight, buttonClasses } from '../ui/button';
import { Carousel } from '../ui/carousel';
import { HeartIcon, InstagramIcon } from '../ui/icons';

const AVATAR_TONES = [
  'from-[#e7cfa3] to-[#c49a5e]',
  'from-[#d9c2a8] to-[#7c5638]',
  'from-[#efe0c8] to-[#a98a62]',
];

/** Отзывы читателей из API (GET /reviews/latest). */
export async function ReviewsSection({ reviews }: { reviews: LatestReview[] }) {
  const t = await getTranslations('reviews');
  const ts = await getTranslations('sections');

  return (
    <section className="relative mt-24" aria-labelledby="reviews-title">
      <div className="container-page grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2.15fr)]">
        <div>
          <h2
            id="reviews-title"
            className="text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('title')}
          </h2>
          <p className="mt-3 text-sm text-ink/70">{t('subtitle')}</p>
          <Link href="/books" className={buttonClasses('primary', 'mt-6')}>
            {t('leave')} <ArrowRight />
          </Link>
        </div>

        {reviews.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <Carousel prevLabel={ts('prev')} nextLabel={ts('next')}>
            {reviews.map((review, index) => (
              <li key={review.id} className="w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]">
                <figure className="card flex h-full flex-col p-5">
                  <figcaption className="flex items-center gap-3">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-base font-semibold text-white ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
                      aria-hidden="true"
                    >
                      {review.author.name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {review.author.name}
                      </span>
                      <span
                        className="text-xs tracking-[0.15em] text-gold"
                        role="img"
                        aria-label={t('rating', { rating: review.rating })}
                      >
                        {'★'.repeat(review.rating)}
                        <span className="text-sand">{'★'.repeat(5 - review.rating)}</span>
                      </span>
                    </span>
                  </figcaption>
                  <blockquote className="mt-3 line-clamp-4 text-[0.85rem] leading-relaxed text-ink/85">
                    {review.text}
                  </blockquote>
                  {review.product && (
                    <Link
                      href={`/${review.product.type === 'BOOK' ? 'books' : 'audiobooks'}/${review.product.slug}`}
                      className="mt-auto pt-3 text-xs text-muted hover:text-cocoa"
                    >
                      {t('about', { title: review.product.title })}
                      {review.isVerifiedPurchase && (
                        <span className="ml-2 rounded-full bg-cocoa-100 px-2 py-0.5 text-[0.65rem] text-cocoa-500">
                          {t('verified')}
                        </span>
                      )}
                    </Link>
                  )}
                </figure>
              </li>
            ))}
          </Carousel>
        )}
      </div>
    </section>
  );
}

/** «Будь частью читательского сообщества»: снимки-полароиды и ссылка на Instagram. */
export async function CommunitySection({ books }: { books: BookListItem[] }) {
  const t = await getTranslations('community');
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/oku_24/';
  const tilts = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6'];

  return (
    <section className="relative mt-24 overflow-hidden" aria-labelledby="community-title">
      <LeafBranch className="pointer-events-none absolute top-0 -left-6 hidden h-40 w-28 lg:block" />
      <div className="container-page grid items-center gap-10 lg:grid-cols-[0.8fr_1.5fr_1fr]">
        <div>
          <h2
            id="community-title"
            className="text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('title')}
          </h2>
          <p className="mt-3 max-w-xs text-sm text-ink/70">{t('text')}</p>
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('primary', 'mt-6')}
          >
            <InstagramIcon className="size-4" />
            {t('button')}
          </a>
        </div>

        {books.length > 0 && (
          <ul className="flex items-center justify-center gap-3 py-4 sm:gap-5" aria-hidden="true">
            {books.slice(0, 4).map((book, index) => (
              <li
                key={book.id}
                className={`w-1/4 max-w-40 rounded-md bg-white p-2 pb-6 shadow-[0_16px_30px_-16px_rgb(43_29_21/0.6)] transition-transform hover:rotate-0 ${tilts[index]}`}
              >
                <div className="bg-cream px-[14%] py-[12%]">
                  <BookCover
                    slug={book.slug}
                    title={book.title}
                    author={book.author}
                    coverUrl={book.coverUrl}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="relative mx-auto flex w-full max-w-80 flex-col items-center">
          <p className="mb-4 flex items-center gap-2 font-display text-2xl text-cocoa">
            {t('caption')}
            <Sparkle className="size-4 text-gold" />
            <HeartIcon className="size-5" />
          </p>
          <Image
            src="/illustrations/community-arch.webp"
            alt=""
            width={900}
            height={474}
            sizes="(min-width: 1024px) 22vw, 80vw"
            className="h-auto w-full drop-shadow-[0_20px_24px_rgb(91_56_30/0.25)]"
          />
        </div>
      </div>
    </section>
  );
}
