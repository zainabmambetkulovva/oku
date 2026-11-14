import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CartView } from '@/components/cart/cart-view';
import { BookCard } from '@/components/catalog/product-card';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type { BookListItem, DeliveryOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cartPage' });
  return { title: t('title'), robots: { index: false } };
}

/** Корзина. Товары хранятся у покупателя (гость) или в аккаунте — показывает их клиент. */
export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('cartPage');
  const [delivery, popular] = await Promise.all([
    safely(() => apiFetch<DeliveryOption[]>('/orders/delivery-options'), [], 'delivery options'),
    safely(
      () => apiFetchPage<BookListItem>('/books?sort=popular&inStock=true&limit=4'),
      null,
      'popular books',
    ),
  ]);
  const books = popular?.data ?? [];

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-[2rem] font-medium text-cocoa sm:text-[2.5rem]">{t('title')}</h1>
      <CartView
        deliveryOptions={delivery}
        recommendations={
          books.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {books.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} />
                </li>
              ))}
            </ul>
          ) : null
        }
      />
    </div>
  );
}
