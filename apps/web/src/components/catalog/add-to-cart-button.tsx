'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useHydrated } from '@/lib/use-hydrated';
import { useCart, type GuestCartItem } from '@/store/cart';
import { CartIcon, CheckIcon } from '../ui/icons';
import { ArrowRight } from '../ui/button';

interface AddToCartButtonProps {
  item: Omit<GuestCartItem, 'quantity'>;
  disabled?: boolean;
}

/** Кнопка «В корзину» из макета. Повторное нажатие на книгу добавляет ещё экземпляр. */
export function AddToCartButton({ item, disabled = false }: AddToCartButtonProps) {
  const t = useTranslations('product');
  const hydrated = useHydrated();
  const add = useCart((state) => state.add);
  const inCart =
    useCart((state) => state.items.some((i) => i.type === item.type && i.id === item.id)) &&
    hydrated;
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [justAdded]);

  if (disabled) {
    return (
      <span className="inline-flex w-full items-center justify-center rounded-full bg-sand/60 px-3 py-2 text-xs font-semibold text-muted">
        {t('outOfStock')}
      </span>
    );
  }

  const audiobookInCart = item.type === 'AUDIOBOOK' && inCart;
  return (
    <button
      type="button"
      disabled={audiobookInCart}
      onClick={() => {
        add(item);
        setJustAdded(true);
      }}
      className="inline-flex w-full items-center justify-between gap-2 rounded-full bg-forest px-3 py-2 text-xs font-semibold text-milk transition-colors hover:bg-forest-700 disabled:bg-forest-500"
    >
      {justAdded || audiobookInCart ? (
        <CheckIcon className="size-4" />
      ) : (
        <CartIcon className="size-4" />
      )}
      <span className="flex-1 text-left">
        {justAdded || audiobookInCart ? t('added') : t('addToCart')}
      </span>
      <ArrowRight className="size-3.5" />
    </button>
  );
}
