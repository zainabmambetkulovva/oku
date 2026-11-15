'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, apiFetchPage } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { BookDetails, BookListItem } from '@/lib/types';
import { AddToCartButton } from '../catalog/add-to-cart-button';
import { BookCover } from '../catalog/book-cover';
import { teaser } from '@/lib/blind-date';
import { Button } from '../ui/button';

/** «Свидание вслепую»: случайная книга из каталога в наличии, сначала только подсказки. */
export function BlindDate() {
  const t = useTranslations('blindDate');
  const tl = useTranslations('catalog.languages');
  const pool = useRef<BookListItem[] | null>(null);
  const [book, setBook] = useState<BookDetails | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'empty'>('loading');

  const next = useCallback(async () => {
    setState('loading');
    setRevealed(false);
    pool.current ??= await apiFetchPage<BookListItem>('/books?inStock=true&sort=popular&limit=50')
      .then((page) => page.data)
      .catch(() => []);
    const candidates = pool.current.filter((item) => item.id !== book?.id);
    if (candidates.length === 0 && !book) return setState('empty');
    const pick =
      candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    if (pick) {
      const details = await apiFetch<BookDetails>(`/books/${encodeURIComponent(pick.slug)}`).catch(
        () => null,
      );
      if (details) setBook(details);
    }
    setState('ready');
  }, [book]);

  useEffect(() => {
    void next();
    // Первая книга — один раз при открытии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hints = book
    ? [
        book.categories[0] && t('category', { name: book.categories[0].name }),
        book.language &&
          t('language', { name: tl.has(book.language) ? tl(book.language) : book.language }),
        book.pages && t('pages', { count: book.pages }),
        book.publicationYear && t('year', { year: book.publicationYear }),
        t('price', { price: formatPrice(book.price) }),
      ].filter(Boolean)
    : [];
  const text = book ? teaser(book) : null;

  return (
    <section
      id="blind-date"
      className="card scroll-mt-24 p-6 sm:p-8"
      aria-labelledby="blind-date-title"
      data-testid="blind-date"
    >
      <h2 id="blind-date-title" className="font-display text-2xl text-cocoa sm:text-[1.9rem]">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-ink/70">{t('intro')}</p>

      {state === 'empty' && <p className="mt-5 text-sm text-ink/75">{t('empty')}</p>}
      {state === 'loading' && !book && (
        <p role="status" className="mt-5 animate-pulse text-sm text-muted">
          {t('loading')}
        </p>
      )}

      {book && (
        <div
          className={`mt-6 grid items-center gap-6 sm:grid-cols-[12rem_1fr] ${state === 'loading' ? 'opacity-50' : ''}`}
        >
          <div className="relative mx-auto w-44 [perspective:900px]">
            {revealed ? (
              <div className="animate-[book-reveal_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both]">
                <BookCover
                  slug={book.slug}
                  title={book.title}
                  author={book.author}
                  coverUrl={book.coverUrl}
                />
              </div>
            ) : (
              <div
                className="grid aspect-[2/3] place-items-center rounded-md bg-[repeating-linear-gradient(135deg,#c9a77c_0_14px,#bf9b6e_14px_28px)] shadow-[6px_10px_18px_-8px_rgb(43_29_21/0.55)]"
                aria-hidden="true"
                data-testid="wrapped-book"
              >
                <span className="h-full w-6 bg-[#8a3524]/80 shadow-inner" />
                <span className="absolute top-1/2 h-6 w-full -translate-y-1/2 bg-[#8a3524]/80" />
                <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#a3412c] text-xl text-milk shadow-md">
                  ?
                </span>
              </div>
            )}
          </div>

          <div aria-live="polite">
            {revealed ? (
              <div data-testid="revealed-book">
                <p className="font-display text-2xl text-cocoa">{book.title}</p>
                <p className="text-sm text-ink/75">{book.author}</p>
                <p className="mt-2 font-semibold text-cocoa">{formatPrice(book.price)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <AddToCartButton
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
                  <Link
                    href={`/books/${book.slug}`}
                    className="text-sm font-semibold text-cocoa underline"
                  >
                    {t('open')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
                  {t('hints')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2" data-testid="blind-date-hints">
                  {hints.map((hint) => (
                    <li
                      key={hint as string}
                      className="rounded-full border border-sand bg-white/70 px-3 py-1 text-xs text-ink"
                    >
                      {hint}
                    </li>
                  ))}
                </ul>
                {text && (
                  <p className="mt-4 text-sm leading-relaxed text-ink/80 italic">
                    {t('teaser', { text })}
                  </p>
                )}
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {!revealed && <Button onClick={() => setRevealed(true)}>{t('unwrap')}</Button>}
              <Button variant="outline" onClick={() => void next()} disabled={state === 'loading'}>
                {t('another')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
