import { getTranslations } from 'next-intl/server';
import { PICKUP } from '@/lib/site';

/** Адрес и часы работы пункта самовывоза. */
export async function PickupCard({ className = '' }: { className?: string }) {
  const t = await getTranslations('pickup');
  return (
    <section className={`card p-6 sm:p-7 ${className}`} data-testid="pickup">
      <h2 className="text-xl font-medium text-cocoa sm:text-2xl">{t('title')}</h2>
      <p className="mt-3 font-display text-lg text-cocoa-700">{t('address')}</p>
      <p className="mt-1 text-sm text-ink/75">{t('hours', { hours: PICKUP.hours })}</p>
      <a
        href={PICKUP.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-cocoa underline"
      >
        {t('map')}
      </a>
    </section>
  );
}
