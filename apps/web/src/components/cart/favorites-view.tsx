'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { useHydrated } from '@/lib/use-hydrated';
import { useCart } from '@/store/cart';
import { type FavoriteItem, useFavorites } from '@/store/favorites';
import { useToasts } from '@/store/toast';
import { BookCover } from '../catalog/book-cover';
import { buttonClasses } from '../ui/button';
import { CartIcon, HeartIcon } from '../ui/icons';

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const t = useTranslations('favoritesPage');
  const tc = useTranslations('cartPage');
  const tt = useTranslations('toast');
  const remove = useFavorites((state) => state.remove);
  const toggle = useFavorites((state) => state.toggle);
  const add = useCart((state) => state.add);
  const inCart = useCart((state) =>
    state.items.some((i) => i.type === item.type && i.id === item.id),
  );
  const showToast = useToasts((state) => state.show);
  const isBook = item.type === 'BOOK';
  const href = `/${isBook ? 'books' : 'audiobooks'}/${item.slug}`;
  const unavailable = item.isAvailable === false;
  const outOfStock = isBook && item.stock === 0;
  const { isAvailable: _available, ...product } = item;

  return (
    <article
      className="card lift group relative flex h-full flex-col p-3.5"
      data-testid="favorite-card"
    >
      <button
        type="button"
        onClick={() => {
          remove(item.type, item.id);
          showToast({
            message: t('removed', { title: item.title }),
            action: { label: tc('undo'), onClick: () => toggle(item) },
          });
        }}
        aria-label={t('remove')}
        className="absolute top-2.5 right-2.5 z-10 grid size-8 place-items-center rounded-full text-[#b4442e] transition hover:scale-110"
      >
        <HeartIcon filled className="size-[1.15rem]" />
      </button>
      <Link href={href} className={`block pt-3 pb-2 ${isBook ? 'px-[16%]' : 'px-[10%]'}`}>
        <BookCover
          slug={item.slug}
          title={item.title}
          author={item.author}
          coverUrl={item.coverUrl}
          square={!isBook}
          className={unavailable ? 'opacity-50 grayscale' : ''}
        />
      </Link>
      <div className="mt-2 flex flex-1 flex-col px-1">
        <p className="text-[0.65rem] font-semibold tracking-wide text-gold-dark uppercase">
          {isBook ? tc('book') : tc('audiobook')}
        </p>
        <Link href={href} className="line-clamp-2 text-sm font-semibold text-ink hover:underline">
          {item.title}
        </Link>
        <p className="text-xs text-muted">{item.author}</p>
        <p className="mt-2 text-sm font-bold text-cocoa">{formatPrice(item.price)}</p>
        <div className="mt-auto pt-3">
          {unavailable || outOfStock ? (
            <span className="block rounded-full bg-sand/60 px-3 py-2 text-center text-xs font-semibold text-muted">
              {unavailable ? t('unavailable') : t('outOfStock')}
            </span>
          ) : (
            <button
              type="button"
              disabled={inCart && !isBook}
              onClick={() => {
                add(product);
                remove(item.type, item.id);
                showToast({
                  message: t('moved', { title: item.title }),
                  action: { label: tt('openCart'), href: '/cart' },
                });
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cocoa px-3 py-2 text-xs font-semibold text-milk transition-colors hover:bg-cocoa-700 disabled:bg-cocoa-500"
            >
              <CartIcon className="size-4" />
              {inCart && !isBook ? t('inCart') : t('toCart')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Избранное: карточки с «Переложить в корзину» и отменой удаления. */
export function FavoritesView({ recommendations }: { recommendations: ReactNode }) {
  const t = useTranslations('favoritesPage');
  const tc = useTranslations('cartPage');
  const hydrated = useHydrated();
  const items = useFavorites((state) => state.items);
  const status = useAuth((state) => state.status);

  if (!hydrated) return <p className="mt-8 animate-pulse text-sm text-muted">{tc('loading')}</p>;

  return (
    <>
      {status !== 'authenticated' && items.length > 0 && (
        <p className="mt-4 text-sm text-ink/70">
          {t('guestNote')}{' '}
          <Link
            href={`/login?next=${encodeURIComponent('/favorites')}`}
            className="font-semibold text-cocoa underline"
          >
            {t('signIn')}
          </Link>
        </p>
      )}
      {items.length === 0 ? (
        <div data-testid="favorites-empty">
          <div className="card mt-8 p-10 text-center">
            <p className="font-display text-2xl text-cocoa">{t('emptyTitle')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{t('emptyText')}</p>
            <Link href="/books" className={buttonClasses('primary', 'mt-6')}>
              {tc('toCatalog')}
            </Link>
          </div>
          {recommendations && (
            <section className="mt-14" aria-labelledby="recommended-heading">
              <h2 id="recommended-heading" className="mb-6 text-[1.75rem] font-medium text-cocoa">
                {tc('recommended')}
              </h2>
              {recommendations}
            </section>
          )}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink/70">{t('count', { count: items.length })}</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {items.map((item) => (
              <li key={`${item.type}:${item.id}`}>
                <FavoriteCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
