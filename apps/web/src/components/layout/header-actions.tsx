'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useHydrated } from '@/lib/use-hydrated';
import { cartCount, useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { CartIcon, HeartIcon, SearchIcon, UserIcon } from '../ui/icons';
import { SearchOverlay } from './search-overlay';

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
  const hydrated = useHydrated();
  const cart = useCart((state) => cartCount(state.items));
  const favorites = useFavorites((state) => state.keys.length);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const iconButton =
    'relative grid size-10 place-items-center rounded-full text-cocoa transition hover:bg-cocoa-100';

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        className={iconButton}
        onClick={() => setSearchOpen(true)}
        aria-label={t('search')}
        aria-haspopup="dialog"
      >
        <SearchIcon />
      </button>
      {searchOpen && <SearchOverlay onClose={closeSearch} />}
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
      <Link href="/login" className={`${iconButton} hidden sm:grid`} aria-label={t('account')}>
        <UserIcon />
      </Link>
    </div>
  );
}
