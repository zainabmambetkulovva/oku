'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetchPage } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { CloseIcon, HeadphonesIcon, SearchIcon } from '../ui/icons';

type Results = { books: BookListItem[]; audiobooks: AudiobookListItem[] };

/**
 * Выдвижной поиск: подсказки из каталога по названию и автору (книги и аудиокниги),
 * пустой результат, ошибка; Enter — все результаты, Esc — закрыть.
 */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const t = useTranslations('search');
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<Results>({ books: [], audiobooks: [] });

  useEffect(() => {
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setState('idle');
      return;
    }
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(async () => {
      try {
        const search = encodeURIComponent(value);
        const [books, audiobooks] = await Promise.all([
          apiFetchPage<BookListItem>(`/books?search=${search}&limit=5`),
          apiFetchPage<AudiobookListItem>(`/audiobooks?search=${search}&limit=3`),
        ]);
        if (!cancelled) {
          setResults({ books: books.data, audiobooks: audiobooks.data });
          setState('done');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const value = query.trim();
  const empty = state === 'done' && results.books.length + results.audiobooks.length === 0;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('title')}>
      <button
        type="button"
        aria-label={t('title')}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-[page-in_0.25s_ease-out] bg-cocoa/35 backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-3 w-[min(46rem,calc(100%-1.5rem))] animate-[page-in_0.35s_cubic-bezier(0.2,0.7,0.2,1)] overflow-hidden rounded-[1.8rem] border border-white/60 bg-[#fbebdd]/95 shadow-2xl sm:mt-20">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (value) {
              onClose();
              router.push(`/books?search=${encodeURIComponent(value)}`);
            }
          }}
          className="flex items-center gap-3 border-b border-sand/60 px-5 py-4"
        >
          <SearchIcon className="size-5 shrink-0 text-gold-dark" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="w-full bg-transparent font-display text-xl text-cocoa outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('title')}
            className="grid size-9 shrink-0 place-items-center rounded-full text-cocoa hover:bg-white/70"
          >
            <CloseIcon className="size-4" />
          </button>
        </form>

        <div className="max-h-[65dvh] overflow-y-auto p-3" aria-live="polite">
          {state === 'idle' && (
            <p className="px-3 py-6 text-center text-sm text-muted">
              {value.length === 1 ? t('minChars') : t('hint')}
            </p>
          )}
          {state === 'loading' && (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('loading')}</p>
          )}
          {state === 'error' && (
            <p className="px-3 py-6 text-center text-sm text-[#8a3524]">{t('error')}</p>
          )}
          {empty && (
            <p className="px-3 py-6 text-center text-sm text-muted" data-testid="search-empty">
              {t('empty', { query: value })}
            </p>
          )}
          {state === 'done' && !empty && (
            <>
              {results.books.length > 0 && (
                <section aria-label={t('books')}>
                  <h2 className="px-3 pt-2 pb-1 font-sans text-xs font-semibold text-muted">
                    {t('books')}
                  </h2>
                  <ul>
                    {results.books.map((book) => (
                      <li key={book.id}>
                        <Link
                          href={`/books/${book.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-white/70"
                        >
                          <span className="w-10 shrink-0">
                            <BookCover
                              slug={book.slug}
                              title={book.title}
                              author={book.author}
                              coverUrl={book.coverUrl}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {book.title}
                            </span>
                            <span className="block truncate text-xs text-muted">{book.author}</span>
                          </span>
                          <span className="text-sm font-bold text-cocoa">
                            {formatPrice(book.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.audiobooks.length > 0 && (
                <section aria-label={t('audiobooks')}>
                  <h2 className="px-3 pt-3 pb-1 font-sans text-xs font-semibold text-muted">
                    {t('audiobooks')}
                  </h2>
                  <ul>
                    {results.audiobooks.map((audiobook) => (
                      <li key={audiobook.id}>
                        <Link
                          href={`/audiobooks/${audiobook.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-white/70"
                        >
                          <span className="w-10 shrink-0">
                            <BookCover
                              slug={audiobook.slug}
                              title={audiobook.title}
                              author={audiobook.author}
                              coverUrl={audiobook.coverUrl}
                              square
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1 truncate text-sm font-semibold text-ink">
                              <HeadphonesIcon className="size-3.5 shrink-0 text-gold-dark" />
                              {audiobook.title}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {audiobook.author}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-cocoa">
                            {formatPrice(audiobook.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <button
                type="submit"
                onClick={() => {
                  onClose();
                  router.push(`/books?search=${encodeURIComponent(value)}`);
                }}
                className="mt-2 w-full rounded-2xl px-3 py-3 text-sm font-semibold text-cocoa hover:bg-white/70"
              >
                {t('all', { query: value })} →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
