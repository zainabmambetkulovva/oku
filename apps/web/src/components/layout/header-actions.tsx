'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/lib/use-hydrated';
import { cartCount, useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { CartIcon, CloseIcon, HeartIcon, SearchIcon, UserIcon } from '../ui/icons';

function CountBadge({ value }: { value: number }) {
  const [bump, setBump] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (value > previous.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 400);
      previous.current = value;
      return () => clearTimeout(timer);
    }
    previous.current = value;
  }, [value]);

  if (value === 0) return null;
  return (
    <span
      className={`absolute -top-1 -right-1 grid min-w-[1.1rem] place-items-center rounded-full bg-cocoa px-1 text-[0.6rem] leading-[1.1rem] font-bold text-milk ${bump ? 'animate-bump' : ''}`}
      data-testid="count-badge"
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

/** Поиск, избранное, корзина и кабинет в шапке. */
export function HeaderActions() {
  const t = useTranslations('nav');
  const router = useRouter();
  const hydrated = useHydrated();
  const cart = useCart((state) => cartCount(state.items));
  const favorites = useFavorites((state) => state.keys.length);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const iconButton =
    'relative grid size-10 place-items-center rounded-full text-cocoa transition hover:bg-cocoa-100';

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {searchOpen ? (
        <form
          role="search"
          className="absolute inset-x-4 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2 rounded-full border border-sand bg-milk px-4 py-2 shadow-lg sm:static sm:w-72 sm:translate-y-0 sm:shadow-none"
          onSubmit={(event) => {
            event.preventDefault();
            const value = query.trim();
            if (value) router.push(`/books?search=${encodeURIComponent(value)}`);
          }}
        >
          <SearchIcon className="size-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            onKeyDown={(event) => event.key === 'Escape' && setSearchOpen(false)}
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label={t('close')}
            className="text-muted hover:text-cocoa"
          >
            <CloseIcon className="size-4" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className={iconButton}
          onClick={() => setSearchOpen(true)}
          aria-label={t('search')}
        >
          <SearchIcon />
        </button>
      )}
      <Link
        href="/favorites"
        className={`${iconButton} hidden sm:grid`}
        aria-label={t('favorites')}
      >
        <HeartIcon />
        {hydrated && <CountBadge value={favorites} />}
      </Link>
      <Link href="/cart" className={iconButton} aria-label={t('cart')} data-testid="header-cart">
        <CartIcon />
        {hydrated && <CountBadge value={cart} />}
      </Link>
      <Link href="/account" className={`${iconButton} hidden sm:grid`} aria-label={t('account')}>
        <UserIcon />
      </Link>
    </div>
  );
}
