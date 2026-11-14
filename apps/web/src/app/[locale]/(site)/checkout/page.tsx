import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { apiFetch, safely } from '@/lib/api';
import type { DeliveryOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false } };
}

/** Оформление заказа: получатель, доставка, адрес, оплата (Finik или наличные). */
export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout');
  const delivery = await safely(
    () => apiFetch<DeliveryOption[]>('/orders/delivery-options'),
    [],
    'delivery options',
  );

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-[2rem] font-medium text-cocoa sm:text-[2.5rem]">{t('title')}</h1>
      <CheckoutForm deliveryOptions={delivery} />
    </div>
  );
}
