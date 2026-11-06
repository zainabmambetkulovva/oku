import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatPrice, splitDuration } from '@/lib/format';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { HeadphonesIcon } from '../ui/icons';
import { AddToCartButton } from './add-to-cart-button';
import { BookCover } from './book-cover';
import { FavoriteButton } from './favorite-button';

function RatingStars({
  average,
  count,
  label,
}: {
  average: number | null;
  count: number;
  label: string;
}) {
  if (!average) return null;
  return (
    <span className="flex items-center gap-1 text-[0.7rem] text-muted" title={label}>
      <span className="text-gold" aria-hidden="true">
        ★
      </span>
      {average.toFixed(1)}
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">({count})</span>
    </span>
  );
}

/** Карточка печатной книги: обложка, избранное, название, автор, цена, «В корзину». */
export async function BookCard({ book }: { book: BookListItem }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('product');

  return (
    <article className="card group relative flex h-full flex-col p-3 transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      <FavoriteButton type="BOOK" id={book.id} className="absolute top-2 right-2 z-10" />
      <Link href={`/books/${book.slug}`} className="block rounded-xl bg-cream/80 px-6 pt-4 pb-3">
        <BookCover
          slug={book.slug}
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          className="transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]"
        />
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1 px-1">
        <Link
          href={`/books/${book.slug}`}
          className="line-clamp-2 text-sm leading-snug font-semibold text-ink hover:text-forest"
        >
          {book.title}
        </Link>
        <span className="line-clamp-1 text-xs text-muted">{book.author}</span>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-forest">{formatPrice(book.price, locale)}</span>
          <RatingStars
            average={book.rating.average}
            count={book.rating.count}
            label={t('reviews', { count: book.rating.count })}
          />
        </div>
        <div className="pt-2">
          <AddToCartButton
            disabled={!book.inStock}
            item={{
              type: 'BOOK',
              id: book.id,
              slug: book.slug,
              title: book.title,
              author: book.author,
              coverUrl: book.coverUrl,
              price: book.price,
            }}
          />
        </div>
      </div>
    </article>
  );
}

/** Карточка аудиокниги: квадратная обложка, длительность, диктор. */
export async function AudiobookCard({ audiobook }: { audiobook: AudiobookListItem }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('product');
  const tu = await getTranslations('units');
  const { hours, minutes } = splitDuration(audiobook.durationSeconds);
  const duration = [
    hours ? tu('hours', { count: hours }) : null,
    minutes ? tu('minutes', { count: minutes }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className="card group relative flex h-full flex-col p-3 transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      <FavoriteButton type="AUDIOBOOK" id={audiobook.id} className="absolute top-2 right-2 z-10" />
      <Link
        href={`/audiobooks/${audiobook.slug}`}
        className="relative block rounded-xl bg-cream/80 p-4"
      >
        <BookCover
          slug={audiobook.slug}
          title={audiobook.title}
          author={audiobook.author}
          coverUrl={audiobook.coverUrl}
          square
        />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-forest/90 px-2 py-1 text-[0.65rem] font-semibold text-milk">
          <HeadphonesIcon className="size-3.5" />
          {duration}
        </span>
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1 px-1">
        <Link
          href={`/audiobooks/${audiobook.slug}`}
          className="line-clamp-2 text-sm leading-snug font-semibold text-ink hover:text-forest"
        >
          {audiobook.title}
        </Link>
        <span className="line-clamp-1 text-xs text-muted">{audiobook.author}</span>
        {audiobook.hasFreePreview && (
          <span className="text-[0.7rem] text-forest-500">{t('freePreview')}</span>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-forest">
            {formatPrice(audiobook.price, locale)}
          </span>
          <RatingStars
            average={audiobook.rating.average}
            count={audiobook.rating.count}
            label={t('reviews', { count: audiobook.rating.count })}
          />
        </div>
        <div className="pt-2">
          <AddToCartButton
            item={{
              type: 'AUDIOBOOK',
              id: audiobook.id,
              slug: audiobook.slug,
              title: audiobook.title,
              author: audiobook.author,
              coverUrl: audiobook.coverUrl,
              price: audiobook.price,
            }}
          />
        </div>
      </div>
    </article>
  );
}
