import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
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
    <span className="mt-1 flex items-center gap-1 text-[0.7rem] text-muted" title={label}>
      <span className="text-gold" aria-hidden="true">
        ★
      </span>
      {average.toFixed(1)}
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">({count})</span>
    </span>
  );
}

/** Карточка книги из макета: обложка с тенью, ♡, название, автор, цена и круглая корзина. */
export async function BookCard({ book }: { book: BookListItem }) {
  const t = await getTranslations('product');

  return (
    <article className="card lift group flex h-full flex-col p-3.5">
      <FavoriteButton
        item={{
          type: 'BOOK',
          id: book.id,
          slug: book.slug,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          price: book.price,
          stock: book.stockQuantity,
        }}
        className="absolute top-2.5 right-2.5 z-10"
      />
      <Link href={`/books/${book.slug}`} className="block px-[16%] pt-3 pb-2">
        <BookCover
          slug={book.slug}
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          className="shadow-[6px_10px_18px_-8px_rgb(43_29_21/0.55)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]"
        />
      </Link>
      <div className="mt-2 flex flex-1 flex-col px-0.5">
        <Link
          href={`/books/${book.slug}`}
          className="line-clamp-2 text-[0.82rem] leading-snug font-semibold text-ink hover:text-cocoa-500"
        >
          {book.title}
        </Link>
        <span className="mt-0.5 line-clamp-1 text-[0.7rem] text-muted">{book.author}</span>
        <RatingStars
          average={book.rating.average}
          count={book.rating.count}
          label={t('reviews', { count: book.rating.count })}
        />
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-sm font-bold text-cocoa" data-testid="price">
            {formatPrice(book.price)}
          </span>
          <AddToCartButton
            variant="icon"
            disabled={!book.inStock}
            item={{
              type: 'BOOK',
              id: book.id,
              slug: book.slug,
              title: book.title,
              author: book.author,
              coverUrl: book.coverUrl,
              price: book.price,
              stock: book.stockQuantity,
            }}
          />
        </div>
      </div>
    </article>
  );
}

/** Карточка аудиокниги: квадратная обложка, длительность, отметка о бесплатном фрагменте. */
export async function AudiobookCard({ audiobook }: { audiobook: AudiobookListItem }) {
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
    <article className="card lift group flex h-full flex-col p-3.5">
      <FavoriteButton
        item={{
          type: 'AUDIOBOOK',
          id: audiobook.id,
          slug: audiobook.slug,
          title: audiobook.title,
          author: audiobook.author,
          coverUrl: audiobook.coverUrl,
          price: audiobook.price,
        }}
        className="absolute top-2.5 right-2.5 z-10"
      />
      <Link href={`/audiobooks/${audiobook.slug}`} className="relative block px-[10%] pt-3 pb-2">
        <BookCover
          slug={audiobook.slug}
          title={audiobook.title}
          author={audiobook.author}
          coverUrl={audiobook.coverUrl}
          square
          className="shadow-[6px_10px_18px_-8px_rgb(43_29_21/0.55)]"
        />
      </Link>
      <div className="mt-2 flex flex-1 flex-col px-0.5">
        <Link
          href={`/audiobooks/${audiobook.slug}`}
          className="line-clamp-2 text-[0.82rem] leading-snug font-semibold text-ink hover:text-cocoa-500"
        >
          {audiobook.title}
        </Link>
        <span className="mt-0.5 line-clamp-1 text-[0.7rem] text-muted">{audiobook.author}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-cocoa-500">
          <HeadphonesIcon className="size-3.5" />
          {duration}
        </span>
        {audiobook.hasFreePreview && (
          <span className="mt-1 text-[0.7rem] text-gold-dark">{t('freePreview')}</span>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-sm font-bold text-cocoa" data-testid="price">
            {formatPrice(audiobook.price)}
          </span>
          <AddToCartButton
            variant="icon"
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
