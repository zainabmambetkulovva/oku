'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { useToasts } from '@/store/toast';

/**
 * Связывает корзину и избранное с аккаунтом.
 *  - Вход: гостевые товары переносятся в аккаунт (без дублей), дальше всё хранится
 *    на сервере и одинаково на всех устройствах.
 *  - Выход или истёкшая сессия: в браузере остаётся пусто, данные аккаунта не видны
 *    следующему посетителю.
 * Также показывает ошибки корзины (например, товар закончился, пока покупатель думал).
 */
export function StoreSync() {
  const t = useTranslations('cartPage');
  const status = useAuth((state) => state.status);
  const showToast = useToasts((state) => state.show);
  const cartError = useCart((state) => state.lastError);
  const attached = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      if (attached.current === 'authenticated') return;
      attached.current = 'authenticated';
      void useCart
        .getState()
        .attach()
        .then(({ skipped }) => {
          if (skipped > 0)
            showToast({ message: t('mergeSkipped', { count: skipped }), tone: 'error' });
        })
        .catch(() => undefined);
      void useFavorites
        .getState()
        .attach()
        .catch(() => undefined);
    }
    if (status === 'guest') {
      attached.current = 'guest';
      if (useCart.getState().mode === 'server') useCart.getState().detach();
      if (useFavorites.getState().mode === 'server') useFavorites.getState().detach();
    }
  }, [status, showToast, t]);

  useEffect(() => {
    if (!cartError) return;
    showToast({ message: t(`errors.${cartError}`), tone: 'error' });
    useCart.getState().dismissError();
  }, [cartError, showToast, t]);

  return null;
}
