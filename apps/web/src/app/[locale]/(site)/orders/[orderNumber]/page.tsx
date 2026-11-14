import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { OrderView } from '@/components/checkout/order-view';

type Props = { params: Promise<{ locale: string; orderNumber: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, orderNumber } = await params;
  const t = await getTranslations({ locale, namespace: 'orderPage' });
  return { title: t('title', { number: orderNumber }), robots: { index: false } };
}

/** Страница заказа: статус, оплата, состав, доставка. Данные — из API от имени покупателя. */
export default async function OrderPage({ params }: Props) {
  const { locale, orderNumber } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('orderPage');

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-[2rem] font-medium text-cocoa sm:text-[2.5rem]">
        {t('title', { number: decodeURIComponent(orderNumber) })}
      </h1>
      <Suspense>
        <OrderView orderNumber={decodeURIComponent(orderNumber)} />
      </Suspense>
    </div>
  );
}
