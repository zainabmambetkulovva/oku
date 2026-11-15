'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatPrice } from '@/lib/format';
import { BookCover } from '../catalog/book-cover';

export interface MiniProduct {
  type: 'BOOK' | 'AUDIOBOOK';
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  price: number;
}

/** Небольшая карточка товара для результатов теста. */
export function MiniCard({ product }: { product: MiniProduct }) {
  const t = useTranslations('product');
  const href = `/${product.type === 'BOOK' ? 'books' : 'audiobooks'}/${product.slug}`;
  return (
    <Link
      href={href}
      className="card lift group flex h-full flex-col p-3"
      data-testid="quiz-result"
    >
      <span className={`block ${product.type === 'BOOK' ? 'px-[14%]' : 'px-[6%]'}`}>
        <BookCover
          slug={product.slug}
          title={product.title}
          author={product.author}
          coverUrl={product.coverUrl}
          square={product.type === 'AUDIOBOOK'}
        />
      </span>
      {product.type === 'AUDIOBOOK' && (
        <span className="mt-2 text-[0.65rem] font-semibold tracking-wide text-gold-dark uppercase">
          {t('audiobook')}
        </span>
      )}
      <span className="mt-1 line-clamp-2 text-sm font-semibold text-ink group-hover:underline">
        {product.title}
      </span>
      <span className="text-xs text-muted">{product.author}</span>
      <span className="mt-auto pt-2 text-sm font-bold text-cocoa">
        {formatPrice(product.price)}
      </span>
    </Link>
  );
}
