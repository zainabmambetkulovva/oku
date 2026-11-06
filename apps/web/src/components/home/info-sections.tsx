import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatPrice } from '@/lib/format';
import type { DeliveryOption } from '@/lib/types';
import { CornerOrnament } from '../ornaments/ornaments';
import { MountainLandscape } from '../ornaments/landscape';
import { ArrowRight, buttonClasses } from '../ui/button';
import { GlobeBookIcon, HeadphonesIcon, ShieldIcon, TruckIcon } from '../ui/icons';
import { SectionTitle } from '../ui/section-title';

/** «Окуу маданиятын сактайбыз» — баннер с пейзажем, как блок «Традиции» в макете. */
export async function AboutSection() {
  const t = await getTranslations('about');
  return (
    <section id="about" className="container-page mt-20 scroll-mt-24" aria-labelledby="about-title">
      <div className="card relative grid overflow-hidden md:grid-cols-2">
        <div className="relative h-56 md:h-auto md:min-h-80">
          <MountainLandscape className="absolute inset-0 size-full" />
        </div>
        <div className="relative p-8 sm:p-10">
          <CornerOrnament className="pointer-events-none absolute -top-8 -right-8 size-36 text-gold/40" />
          <h2 id="about-title" className="text-3xl leading-tight font-semibold sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/80 sm:text-base">
            {t('text')}
          </p>
          <Link href="/books" className={`${buttonClasses('primary')} mt-6`}>
            {t('more')} <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function AdvantagesSection() {
  const t = await getTranslations('advantages');
  const ts = await getTranslations('sections');
  const items = [
    { key: 'languages', Icon: GlobeBookIcon },
    { key: 'audio', Icon: HeadphonesIcon },
    { key: 'delivery', Icon: TruckIcon },
    { key: 'payment', Icon: ShieldIcon },
  ] as const;

  return (
    <section className="container-page mt-10" aria-label={ts('advantages')}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ key, Icon }) => (
          <li key={key} className="card flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/60 text-forest">
              <Icon />
            </span>
            <div>
              <h3 className="font-sans text-sm font-bold text-ink">{t(`${key}.title`)}</h3>
              <p className="text-xs text-muted">{t(`${key}.text`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «Как получить заказ»: шаги и стоимость доставки из API. */
export async function DeliverySection({ options }: { options: DeliveryOption[] }) {
  const t = await getTranslations('delivery');
  const ts = await getTranslations('sections');
  const locale = (await getLocale()) as Locale;
  const steps = ['order', 'pay', 'notify', 'receive'] as const;

  return (
    <section
      id="delivery"
      className="container-page mt-20 scroll-mt-24"
      aria-labelledby="delivery-title"
    >
      <SectionTitle id="delivery-title">{ts('delivery')}</SectionTitle>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ol className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step} className="relative flex flex-col items-center text-center">
              {index > 0 && (
                <span
                  className="absolute top-5 right-1/2 hidden h-px w-full border-t border-dashed border-gold sm:block"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 grid size-10 place-items-center rounded-full bg-forest text-sm font-bold text-milk ring-4 ring-milk">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-snug text-ink/85">{t(`steps.${step}`)}</p>
            </li>
          ))}
        </ol>
        {options.length > 0 && (
          <div className="card p-6">
            <h3 className="font-sans text-sm font-bold text-ink">{t('options')}</h3>
            <ul className="mt-3 divide-y divide-sand/70">
              {options.map((option) => (
                <li key={option.method} className="flex items-center justify-between py-3 text-sm">
                  <span>{t(`method.${option.method}`)}</span>
                  <span className="font-semibold text-forest">
                    {option.price === 0 ? t('free') : formatPrice(option.price, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
