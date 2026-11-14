'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { formatPrice } from '@/lib/format';
import { useHydrated } from '@/lib/use-hydrated';
import { useCart, type GuestCartItem } from '@/store/cart';
import { useToasts } from '@/store/toast';
import { FavoriteButton } from '../catalog/favorite-button';
import { Button } from '../ui/button';
import { CartIcon } from '../ui/icons';

interface PurchaseBoxProps {
  item: Omit<GuestCartItem, 'quantity'>;
  /** Только для печатных книг */
  stockQuantity?: number;
}

/**
 * Блок покупки: цена, наличие, количество (не больше остатка), «В корзину», «Купить сейчас»,
 * избранное. Окончательную цену и наличие сервер проверяет при оформлении заказа.
 */
export function PurchaseBox({ item, stockQuantity }: PurchaseBoxProps) {
  const t = useTranslations('productPage');
  const tt = useTranslations('toast');
  const router = useRouter();
  const hydrated = useHydrated();
  const add = useCart((state) => state.add);
  const inCart = useCart((state) =>
    state.items.find((i) => i.type === item.type && i.id === item.id),
  );
  const showToast = useToasts((state) => state.show);
  const isBook = item.type === 'BOOK';
  const stock = stockQuantity ?? 0;
  const available = !isBook || stock > 0;
  const alreadyInCart = hydrated ? (inCart?.quantity ?? 0) : 0;
  const maxAddable = isBook ? Math.max(0, Math.min(stock, 99) - alreadyInCart) : 1;
  const [quantity, setQuantity] = useState(1);
  const audiobookInCart = !isBook && alreadyInCart > 0;

  // Если часть остатка уже в корзине — не даём выбрать больше, чем осталось
  useEffect(() => {
    setQuantity((value) => Math.max(1, Math.min(value, maxAddable)));
  }, [maxAddable]);

  const addToCart = () => {
    add(
      { ...item, stock: isBook ? stock : undefined },
      isBook ? Math.min(quantity, maxAddable) : 1,
    );
    showToast({
      message: tt('addedToCart', { title: item.title }),
      action: { label: tt('openCart'), href: '/cart' },
    });
  };

  return (
    <div className="card space-y-5 p-5 sm:p-6" data-testid="purchase-box">
      <div className="flex items-end justify-between gap-4">
        <p className="font-display text-[2rem] leading-none text-cocoa">
          {formatPrice(item.price)}
        </p>
        <FavoriteButton type={item.type} id={item.id} className="size-11 bg-white/70" />
      </div>

      {isBook && (
        <p
          className={`text-sm font-medium ${stock === 0 ? 'text-[#8a3524]' : stock <= 3 ? 'text-[#9a5b12]' : 'text-[#3f5a24]'}`}
          data-testid="stock"
        >
          {stock === 0
            ? t('outOfStock')
            : stock <= 3
              ? t('lowStock', { count: stock })
              : t('inStock', { count: stock })}
        </p>
      )}

      {isBook && available && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/75">{t('quantity')}</span>
          <div className="flex items-center rounded-full border border-sand bg-white/70">
            <button
              type="button"
              aria-label={t('decrease')}
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid size-10 place-items-center text-lg text-cocoa disabled:opacity-30"
            >
              −
            </button>
            <output
              aria-live="polite"
              className="w-8 text-center font-semibold"
              data-testid="quantity"
            >
              {quantity}
            </output>
            <button
              type="button"
              aria-label={t('increase')}
              disabled={quantity >= maxAddable}
              onClick={() => setQuantity((value) => Math.min(maxAddable, value + 1))}
              className="grid size-10 place-items-center text-lg text-cocoa disabled:opacity-30"
            >
              +
            </button>
          </div>
          {quantity >= maxAddable && maxAddable > 0 && (
            <span className="text-xs text-muted">{t('maxQuantity')}</span>
          )}
        </div>
      )}

      {!isBook && <p className="text-sm text-ink/75">{t('accessForever')}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={addToCart}
          disabled={!available || maxAddable === 0 || audiobookInCart}
          className="magnetic flex-1"
        >
          <CartIcon className="size-4" />
          {audiobookInCart || (isBook && maxAddable === 0 && available)
            ? t('inCart')
            : t('addToCart')}
        </Button>
        <Button
          variant="outline"
          disabled={!available}
          onClick={() => {
            if (maxAddable > 0 && !audiobookInCart) addToCart();
            router.push('/cart');
          }}
          className="magnetic flex-1"
        >
          {isBook ? t('buyNow') : t('buyAudio')}
        </Button>
      </div>
    </div>
  );
}
