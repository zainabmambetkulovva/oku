'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { authFetch, useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { PICKUP } from '@/lib/site';
import type { DeliveryOption, OrderDetails, PaymentSession, SavedAddress } from '@/lib/types';
import { useHydrated } from '@/lib/use-hydrated';
import { cartSubtotal, useCart } from '@/store/cart';
import { textInputClass } from '../auth/password-input';
import { FormAlert } from '../auth/auth-card';
import { BookCover } from '../catalog/book-cover';
import { Button, buttonClasses } from '../ui/button';

type Method = DeliveryOption['method'];
type Payment = 'ONLINE' | 'CASH';

interface AddressFields {
  country: string;
  city: string;
  street: string;
  building: string;
  apartment: string;
  postalCode: string;
}

const PHONE = /^\+?[0-9\s\-()]{7,20}$/;

/** Наличными — только печатные книги при самовывозе или курьеру. */
export function cashAllowed(hasAudiobooks: boolean, method: Method | null): boolean {
  return !hasAudiobooks && (method === 'PICKUP' || method === 'COURIER');
}

/** Ошибка оформления → понятное сообщение. */
function errorKey(error: unknown): 'prices' | 'stock' | 'address' | 'generic' {
  if (!(error instanceof ApiRequestError)) return 'generic';
  const message = error.body?.message ?? '';
  if (error.status === 409) return /price/i.test(String(message)) ? 'prices' : 'stock';
  if (
    error.status === 400 &&
    /address|country|city|street|building/i.test(JSON.stringify(error.body))
  ) {
    return 'address';
  }
  return 'generic';
}

export function CheckoutForm({ deliveryOptions }: { deliveryOptions: DeliveryOption[] }) {
  const t = useTranslations('checkout');
  const td = useTranslations('pages.delivery');
  const tc = useTranslations('cartPage');
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { status, user } = useAuth();
  const items = useCart((state) => state.items);
  const mode = useCart((state) => state.mode);

  const [ready, setReady] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = useState<string | 'new'>('new');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<Method | null>(null);
  const [payment, setPayment] = useState<Payment>('ONLINE');
  const [address, setAddress] = useState<AddressFields>({
    country: 'Кыргызстан',
    city: '',
    street: '',
    building: '',
    apartment: '',
    postalCode: '',
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReturnType<typeof errorKey> | null>(null);

  // Свежая корзина с сервера (цены и наличие) и данные покупателя для подстановки
  useEffect(() => {
    if (status !== 'authenticated' || mode !== 'server' || ready) return;
    void Promise.all([
      useCart.getState().attach(),
      authFetch<SavedAddress[]>('/users/me/addresses').catch(() => []),
      authFetch<{ firstName: string | null; lastName: string | null; phone: string | null }>(
        '/users/me',
      ).catch(() => null),
    ]).then(([, saved, profile]) => {
      setAddresses(saved);
      const preferred = saved.find((a) => a.isDefault) ?? saved[0];
      if (preferred) setAddressId(preferred.id);
      setName(
        [profile?.firstName ?? user?.firstName, profile?.lastName ?? user?.lastName]
          .filter(Boolean)
          .join(' '),
      );
      setPhone(profile?.phone ?? preferred?.phone ?? '');
      setReady(true);
    });
  }, [status, mode, ready, user]);

  const hasBooks = items.some((item) => item.type === 'BOOK');
  const hasAudiobooks = items.some((item) => item.type === 'AUDIOBOOK');
  const hasIssues = items.some((item) => item.issues?.length);
  const option = deliveryOptions.find((o) => o.method === method) ?? null;
  const needsAddress = hasBooks && Boolean(option?.requiresAddress);
  const subtotal = cartSubtotal(items);
  const deliveryPrice = hasBooks && option ? option.price : 0;
  const total = subtotal + deliveryPrice;
  const canPayCash = cashAllowed(hasAudiobooks, method);

  useEffect(() => {
    if (payment === 'CASH' && !canPayCash) setPayment('ONLINE');
  }, [payment, canPayCash]);

  const problems = useMemo(() => {
    const list: string[] = [];
    if (!name.trim()) list.push('name');
    if (!PHONE.test(phone.trim())) list.push('phone');
    if (hasBooks && !method) list.push('method');
    if (needsAddress && addressId === 'new') {
      for (const field of ['country', 'city', 'street', 'building'] as const) {
        if (!address[field].trim()) list.push(field);
      }
    }
    return list;
  }, [name, phone, hasBooks, method, needsAddress, addressId, address]);

  if (!hydrated || status === 'unknown') {
    return <p className="mt-8 animate-pulse text-sm text-muted">{t('loading')}</p>;
  }
  if (status === 'guest') {
    return (
      <div className="card mt-8 max-w-xl p-8">
        <p className="text-sm text-ink/80">{t('signIn')}</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className={buttonClasses('primary', 'mt-5')}
        >
          {t('signInButton')}
        </Link>
      </div>
    );
  }
  if (!ready) return <p className="mt-8 animate-pulse text-sm text-muted">{t('loading')}</p>;
  if (items.length === 0) {
    return (
      <div className="card mt-8 max-w-xl p-8" data-testid="checkout-empty">
        <p className="text-sm text-ink/80">{t('empty')}</p>
        <Link href="/books" className={buttonClasses('primary', 'mt-5')}>
          {t('toCatalog')}
        </Link>
      </div>
    );
  }
  if (hasIssues) {
    return (
      <div className="card mt-8 max-w-xl p-8">
        <FormAlert>{t('fixCart')}</FormAlert>
        <Link href="/cart" className={buttonClasses('primary', 'mt-5')}>
          {t('toCart')}
        </Link>
      </div>
    );
  }

  const invalid = (field: string) => touched && problems.includes(field);
  const fieldError = (field: string, text = t('required')) =>
    invalid(field) ? <span className="mt-1 block text-xs text-[#a3412c]">{text}</span> : null;
  const setField = (field: keyof AddressFields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((current) => ({ ...current, [field]: event.target.value }));

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (problems.length > 0) return;
    setSubmitting(true);
    try {
      let savedId: string | undefined = needsAddress && addressId !== 'new' ? addressId : undefined;
      const manual =
        needsAddress && addressId === 'new'
          ? {
              country: address.country.trim(),
              city: address.city.trim(),
              street: address.street.trim(),
              building: address.building.trim(),
              apartment: address.apartment.trim() || undefined,
              postalCode: address.postalCode.trim() || undefined,
            }
          : undefined;
      if (manual && saveAddress) {
        const created = await authFetch<SavedAddress>('/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify({
            ...manual,
            title: `${manual.city}, ${manual.street}`.slice(0, 50),
            recipientName: name.trim(),
            phone: phone.trim(),
          }),
        }).catch(() => null);
        if (created) savedId = created.id;
      }

      const result = await authFetch<{
        order: OrderDetails;
        payment: PaymentSession | null;
        paymentError: string | null;
      }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          recipientName: name.trim(),
          recipientPhone: phone.trim(),
          ...(hasBooks && { deliveryMethod: method }),
          ...(savedId ? { addressId: savedId } : manual ? { address: manual } : {}),
          paymentMethod: payment,
          comment: comment.trim() || undefined,
          expectedTotal: total,
        }),
      });

      // Заказ создан: сервер уже очистил корзину аккаунта
      useCart.setState({ items: [] });
      if (result.payment?.paymentUrl) {
        window.location.assign(result.payment.paymentUrl);
        return;
      }
      router.push(
        `/orders/${result.order.orderNumber}${result.paymentError ? '?paymentError=1' : ''}`,
      );
    } catch (caught) {
      const key = errorKey(caught);
      setError(key);
      if (key === 'prices' || key === 'stock') {
        await useCart
          .getState()
          .attach()
          .catch(() => undefined);
      }
      setSubmitting(false);
    }
  };

  const radio =
    'flex cursor-pointer items-start gap-3 rounded-2xl border border-sand bg-white/60 p-4 transition has-[:checked]:border-gold has-[:checked]:bg-white has-[:checked]:ring-2 has-[:checked]:ring-gold/30';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]"
      data-testid="checkout-form"
    >
      <div className="space-y-6">
        <fieldset className="card space-y-4 p-6">
          <legend className="float-left mb-2 w-full font-display text-xl text-cocoa">
            {t('recipient')}
          </legend>
          <label className="block text-sm font-medium text-ink/85">
            {t('name')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              aria-invalid={invalid('name')}
              className={textInputClass}
            />
            {fieldError('name', t('nameRequired'))}
          </label>
          <label className="block text-sm font-medium text-ink/85">
            {t('phone')}
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="+996"
              aria-invalid={invalid('phone')}
              className={textInputClass}
            />
            <span className="mt-1 block text-xs text-muted">{t('phoneHint')}</span>
            {fieldError('phone', t('phoneInvalid'))}
          </label>
        </fieldset>

        {hasBooks ? (
          <fieldset className="card space-y-3 p-6" data-testid="delivery-methods">
            <legend className="float-left mb-2 w-full font-display text-xl text-cocoa">
              {t('delivery')}
            </legend>
            {deliveryOptions.map((o) => (
              <label key={o.method} className={radio}>
                <input
                  type="radio"
                  name="delivery"
                  value={o.method}
                  checked={method === o.method}
                  onChange={() => setMethod(o.method)}
                  className="mt-1 accent-[#3a2416]"
                />
                <span className="flex-1">
                  <span className="flex justify-between gap-3 text-sm font-semibold text-ink">
                    {td(`method.${o.method}`)}
                    <span>{o.price === 0 ? t('free') : formatPrice(o.price)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/70">
                    {o.method === 'PICKUP'
                      ? t('pickupAt', { hours: PICKUP.hours })
                      : td(`methodText.${o.method}`)}
                  </span>
                </span>
              </label>
            ))}
            {fieldError('method')}
          </fieldset>
        ) : (
          <p className="card p-6 text-sm text-ink/75">{t('digitalOnly')}</p>
        )}

        {needsAddress && (
          <fieldset className="card space-y-4 p-6" data-testid="address">
            <legend className="float-left mb-2 w-full font-display text-xl text-cocoa">
              {t('address')}
            </legend>
            {addresses.length > 0 && (
              <div className="clear-both space-y-2">
                <p className="text-sm text-ink/75">{t('savedAddresses')}</p>
                {addresses.map((saved) => (
                  <label key={saved.id} className={radio}>
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === saved.id}
                      onChange={() => setAddressId(saved.id)}
                      className="mt-1 accent-[#3a2416]"
                    />
                    <span className="text-sm">
                      <span className="font-semibold">{saved.title}</span>
                      <span className="block text-xs text-ink/70">
                        {[saved.city, saved.street, saved.building, saved.apartment]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </span>
                  </label>
                ))}
                <label className={radio}>
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === 'new'}
                    onChange={() => setAddressId('new')}
                    className="mt-1 accent-[#3a2416]"
                  />
                  <span className="text-sm font-semibold">{t('newAddress')}</span>
                </label>
              </div>
            )}
            {addressId === 'new' && (
              <div className="clear-both grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['country', 'country-name'],
                    ['city', 'address-level2'],
                    ['street', 'address-line1'],
                    ['building', 'off'],
                    ['apartment', 'address-line2'],
                    ['postalCode', 'postal-code'],
                  ] as const
                ).map(([field, autoComplete]) => (
                  <label key={field} className="block text-sm font-medium text-ink/85">
                    {t(field)}
                    <input
                      value={address[field]}
                      onChange={setField(field)}
                      autoComplete={autoComplete}
                      aria-invalid={invalid(field)}
                      className={textInputClass}
                    />
                    {fieldError(field)}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-ink/80 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(event) => setSaveAddress(event.target.checked)}
                    className="size-4 accent-[#3a2416]"
                  />
                  {t('saveAddress')}
                </label>
              </div>
            )}
          </fieldset>
        )}

        <fieldset className="card space-y-3 p-6" data-testid="payment-methods">
          <legend className="float-left mb-2 w-full font-display text-xl text-cocoa">
            {t('payment')}
          </legend>
          <label className={radio}>
            <input
              type="radio"
              name="payment"
              checked={payment === 'ONLINE'}
              onChange={() => setPayment('ONLINE')}
              className="mt-1 accent-[#3a2416]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{t('online')}</span>
              <span className="mt-0.5 block text-xs text-ink/70">{t('onlineText')}</span>
            </span>
          </label>
          <label className={`${radio} ${canPayCash ? '' : 'cursor-not-allowed opacity-50'}`}>
            <input
              type="radio"
              name="payment"
              disabled={!canPayCash}
              checked={payment === 'CASH'}
              onChange={() => setPayment('CASH')}
              className="mt-1 accent-[#3a2416]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{t('cash')}</span>
              <span className="mt-0.5 block text-xs text-ink/70">
                {canPayCash ? t('cashText') : t('cashUnavailable')}
              </span>
            </span>
          </label>
        </fieldset>

        <label className="card block p-6 text-sm font-medium text-ink/85">
          {t('comment')}
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t('commentPlaceholder')}
            className={`${textInputClass} resize-y`}
          />
        </label>
      </div>

      <aside
        className="card h-fit space-y-4 p-6 lg:sticky lg:top-24"
        data-testid="checkout-summary"
      >
        <h2 className="font-display text-2xl text-cocoa">{t('summary')}</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={`${item.type}:${item.id}`} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0">
                <BookCover
                  slug={item.slug}
                  title={item.title}
                  author={item.author}
                  coverUrl={item.coverUrl}
                  square={item.type === 'AUDIOBOOK'}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 font-semibold text-ink">{item.title}</span>
                <span className="text-xs text-muted">
                  {item.type === 'AUDIOBOOK' ? tc('audiobook') : `× ${item.quantity}`}
                </span>
              </span>
              <span className="shrink-0 font-semibold">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-sand pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/75">{t('subtotal')}</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {hasBooks && (
            <div className="flex justify-between">
              <dt className="text-ink/75">{t('deliveryPrice')}</dt>
              <dd data-testid="checkout-delivery">
                {option ? (option.price === 0 ? t('free') : formatPrice(option.price)) : '—'}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-sand pt-3">
            <dt className="font-semibold">{t('total')}</dt>
            <dd className="font-display text-2xl text-cocoa" data-testid="checkout-total">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>
        {payment === 'ONLINE' && <p className="text-xs text-muted">{t('payWithin')}</p>}
        {error && <FormAlert>{t(`errors.${error}`)}</FormAlert>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? t('submitting')
            : payment === 'ONLINE'
              ? t('submitOnline')
              : t('submitCash')}
        </Button>
        <p className="text-xs text-muted">
          {t.rich('agree', {
            terms: (chunks) => (
              <Link href="/terms" target="_blank" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </aside>
    </form>
  );
}
