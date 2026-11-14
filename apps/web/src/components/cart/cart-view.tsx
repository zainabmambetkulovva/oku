'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import type { DeliveryOption } from '@/lib/types';
import { useHydrated } from '@/lib/use-hydrated';
import { cartCount, cartSubtotal, type GuestCartItem, useCart } from '@/store/cart';
import { useToasts } from '@/store/toast';
import { BookCover } from '../catalog/book-cover';
import { buttonClasses } from '../ui/button';

function CartLine({ item }: { item: GuestCartItem }) {
  const t = useTranslations('cartPage');
  const tp = useTranslations('productPage');
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const add = useCart((state) => state.add);
  const showToast = useToasts((state) => state.show);
  const isBook = item.type === 'BOOK';
  const href = `/${isBook ? 'books' : 'audiobooks'}/${item.slug}`;
  const max = isBook ? Math.min(99, item.stock ?? 99) : 1;
  const issue = item.issues?.[0];

  return (
    <li className="card flex gap-4 p-4 sm:p-5" data-testid="cart-line">
      <Link href={href} className="w-20 shrink-0 sm:w-24">
        <BookCover
          slug={item.slug}
          title={item.title}
          author={item.author}
          coverUrl={item.coverUrl}
          square={!isBook}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold tracking-wide text-gold-dark uppercase">
              {isBook ? t('book') : t('audiobook')}
            </p>
            <Link
              href={href}
              className="font-display text-lg leading-snug text-cocoa hover:underline"
            >
              {item.title}
            </Link>
            <p className="text-sm text-ink/70">{item.author}</p>
          </div>
          <p className="shrink-0 text-right font-semibold text-cocoa" data-testid="line-total">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        {item.previousPrice !== undefined && item.previousPrice !== item.price && (
          <p className="text-xs font-medium text-[#9a5b12]" data-testid="price-changed">
            {t('priceChanged', { price: formatPrice(item.previousPrice) })}
          </p>
        )}
        {issue && (
          <p className="text-xs font-medium text-[#8a3524]" role="alert" data-testid="line-issue">
            {t(`issues.${issue}`, { stock: item.stock ?? 0 })}
            {issue === 'INSUFFICIENT_STOCK' && item.stock ? (
              <button
                type="button"
                onClick={() => setQuantity(item.type, item.id, item.stock!)}
                className="ml-2 font-semibold underline"
              >
                {t('keepAvailable', { stock: item.stock })}
              </button>
            ) : null}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          {isBook ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-sand bg-white/70">
                <button
                  type="button"
                  aria-label={tp('decrease')}
                  disabled={item.quantity <= 1}
                  onClick={() => setQuantity(item.type, item.id, item.quantity - 1)}
                  className="grid size-9 place-items-center text-lg text-cocoa disabled:opacity-30"
                >
                  −
                </button>
                <output
                  className="w-8 text-center text-sm font-semibold"
                  data-testid="line-quantity"
                >
                  {item.quantity}
                </output>
                <button
                  type="button"
                  aria-label={tp('increase')}
                  disabled={item.quantity >= max || issue === 'OUT_OF_STOCK'}
                  onClick={() => setQuantity(item.type, item.id, item.quantity + 1)}
                  className="grid size-9 place-items-center text-lg text-cocoa disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-muted">
                {t('each', { price: formatPrice(item.price) })}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted">{tp('accessForever')}</span>
          )}
          <button
            type="button"
            onClick={() => {
              remove(item.type, item.id);
              const {
                quantity,
                lineId: _line,
                issues: _issues,
                previousPrice: _prev,
                ...product
              } = item;
              showToast({
                message: t('removed', { title: item.title }),
                action: { label: t('undo'), onClick: () => add(product, quantity) },
              });
            }}
            className="text-sm font-semibold text-[#8a3524] underline-offset-2 hover:underline"
          >
            {t('remove')}
          </button>
        </div>
      </div>
    </li>
  );
}

/** Корзина: позиции, проверка цен и наличия, итог с доставкой. */
export function CartView({
  deliveryOptions,
  recommendations,
}: {
  deliveryOptions: DeliveryOption[];
  recommendations: ReactNode;
}) {
  const t = useTranslations('cartPage');
  const td = useTranslations('pages.delivery');
  const pathname = usePathname();
  const hydrated = useHydrated();
  const items = useCart((state) => state.items);
  const mode = useCart((state) => state.mode);
  const clear = useCart((state) => state.clear);
  const status = useAuth((state) => state.status);

  // Гость: цены и остатки могли измениться с момента добавления
  useEffect(() => {
    if (hydrated && mode === 'guest') void useCart.getState().refreshGuest();
  }, [hydrated, mode]);

  if (!hydrated) {
    return <p className="mt-8 animate-pulse text-sm text-muted">{t('loading')}</p>;
  }

  if (items.length === 0) {
    return (
      <div data-testid="cart-empty">
        <div className="card mt-8 p-10 text-center">
          <p className="font-display text-2xl text-cocoa">{t('emptyTitle')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{t('emptyText')}</p>
          <Link href="/books" className={buttonClasses('primary', 'mt-6')}>
            {t('toCatalog')}
          </Link>
        </div>
        {recommendations && (
          <section className="mt-14" aria-labelledby="recommended-heading">
            <h2 id="recommended-heading" className="mb-6 text-[1.75rem] font-medium text-cocoa">
              {t('recommended')}
            </h2>
            {recommendations}
          </section>
        )}
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const hasIssues = items.some((item) => item.issues?.length);
  const needsDelivery = items.some((item) => item.type === 'BOOK');
  const count = cartCount(items);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <ul className="space-y-4">
          {items.map((item) => (
            <CartLine key={`${item.type}:${item.id}`} item={item} />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => window.confirm(t('clearConfirm')) && clear()}
          className="mt-5 text-sm font-semibold text-muted underline-offset-2 hover:text-[#8a3524] hover:underline"
        >
          {t('clear')}
        </button>
      </div>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24" data-testid="cart-summary">
        <h2 className="font-display text-2xl text-cocoa">{t('summary')}</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink/75">{t('items', { count })}</dt>
            <dd className="font-semibold" data-testid="subtotal">
              {formatPrice(subtotal)}
            </dd>
          </div>
          <div>
            <dt className="text-ink/75">{t('delivery')}</dt>
            <dd className="mt-1 text-xs text-ink/70">
              {needsDelivery ? (
                <>
                  {t('deliveryHint')}
                  <ul className="mt-1 space-y-0.5" data-testid="cart-delivery">
                    {deliveryOptions.map((option) => (
                      <li key={option.method} className="flex justify-between gap-2">
                        <span>{td(`method.${option.method}`)}</span>
                        <span className="font-semibold">
                          {option.price === 0 ? t('free') : formatPrice(option.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                t('deliveryDigital')
              )}
            </dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between gap-3 border-t border-sand pt-4">
          <span className="font-semibold text-ink">{t('total')}</span>
          <span className="text-right">
            <span className="font-display text-2xl text-cocoa" data-testid="total">
              {formatPrice(subtotal)}
            </span>
            {needsDelivery && <span className="block text-xs text-muted">{t('plusDelivery')}</span>}
          </span>
        </div>
        {hasIssues && (
          <p className="rounded-2xl bg-[#a3412c]/10 px-3 py-2 text-xs text-[#8a3524]">
            {t('fixIssues')}
          </p>
        )}
        {status === 'authenticated' ? (
          <>
            <Link
              href="/checkout"
              aria-disabled={hasIssues}
              className={buttonClasses(
                'primary',
                `w-full ${hasIssues ? 'pointer-events-none opacity-50' : ''}`,
              )}
              data-testid="to-checkout"
            >
              {t('checkout')}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={buttonClasses('primary', 'w-full')}
            >
              {t('signInToCheckout')}
            </Link>
            <p className="text-xs text-muted">{t('guestNote')}</p>
          </>
        )}
      </aside>
    </div>
  );
}
