import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { booksFlowers } from '@/assets/illustrations';
import { PageSection, PageShell } from '@/components/pages/page-shell';
import { PickupCard } from '@/components/pages/pickup-card';
import { apiFetch, safely } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { DeliveryOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Item = { title: string; text: string };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.delivery' });
  return { title: t('title'), description: t('lead') };
}

/** Тарифы доставки — из API (те же, что применяются при оформлении заказа). */
export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.delivery');
  const options = await safely(
    () => apiFetch<DeliveryOption[]>('/orders/delivery-options'),
    [],
    'delivery options',
  );
  const payment = t.raw('payment') as Item[];
  const notes = t.raw('notes') as string[];

  return (
    <PageShell title={t('title')} lead={t('lead')}>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageSection title={t('methodsTitle')}>
          {options.length === 0 ? (
            <p>{t('unavailable')}</p>
          ) : (
            <ul className="divide-y divide-sand/60" data-testid="delivery-options">
              {options.map((option) => (
                <li
                  key={option.method}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span>
                    <span className="block font-semibold text-ink">
                      {t(`method.${option.method}`)}
                    </span>
                    <span className="text-xs text-muted">{t(`methodText.${option.method}`)}</span>
                  </span>
                  <span className="font-display text-xl text-cocoa">
                    {option.price === 0 ? t('free') : formatPrice(option.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PageSection>
        <PickupCard />
        <div className="grid gap-6 md:grid-cols-2">
          {payment.map((item) => (
            <PageSection key={item.title} title={item.title}>
              <p>{item.text}</p>
            </PageSection>
          ))}
        </div>
        <div className="card grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_14rem]">
          <div>
            <h2 className="text-xl font-medium text-cocoa sm:text-2xl">{t('notesTitle')}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
          <Image src={booksFlowers} alt="" sizes="14rem" className="mx-auto h-auto w-56" />
        </div>
      </div>
    </PageShell>
  );
}
