import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Butterfly, Sparkle } from '../ornaments/decor';
import { ArrowRight, buttonClasses } from '../ui/button';
import { BookOpenIcon, HeartIcon, LeafIcon, QuoteIcon, SupportIcon, TruckIcon } from '../ui/icons';
import { booksFlowers, readingRoom } from '@/assets/illustrations';

/** «Больше, чем просто книги»: окно-арка с горами, текст о магазине и три преимущества. */
export async function AboutSection() {
  const t = await getTranslations('about');
  const features = [
    { key: 'quality', Icon: BookOpenIcon },
    { key: 'delivery', Icon: TruckIcon },
    { key: 'support', Icon: SupportIcon },
  ] as const;

  return (
    <section id="about" className="relative mt-10 scroll-mt-24" aria-labelledby="about-title">
      <div className="container-page grid items-center gap-8 lg:grid-cols-[1.45fr_1fr_0.75fr]">
        {/* Уголок для чтения у окна с видом на горы */}
        <div className="relative lg:-ml-24 xl:-ml-32" aria-hidden="true">
          <div className="absolute -inset-x-[6%] -inset-y-[18%] -z-10 bg-[radial-gradient(ellipse_at_50%_55%,rgb(255_243_230/0.9)_0%,rgb(250_230_210/0.55)_40%,transparent_70%)]" />
          <Image
            src={readingRoom}
            alt=""
            width={1100}
            height={519}
            sizes="(min-width: 1024px) 42vw, 92vw"
            className="h-auto w-full drop-shadow-[0_24px_30px_rgb(91_56_30/0.25)]"
          />
          <Butterfly className="top-2 left-[18%] size-9" delay={1.5} />
        </div>

        <div className="relative">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2
            id="about-title"
            className="mt-3 text-[1.85rem] leading-tight font-medium text-cocoa sm:text-[2.2rem]"
          >
            {t('title')}
            <Sparkle className="ml-3 inline size-5 align-middle text-gold" />
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/75">{t('text')}</p>
          <Link href="/books" className={buttonClasses('outline', 'mt-6')}>
            {t('more')} <ArrowRight />
          </Link>
        </div>

        <ul className="card space-y-1 p-4">
          {features.map(({ key, Icon }) => (
            <li key={key} className="flex items-center gap-4 rounded-2xl p-2">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cocoa-100 text-cocoa">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium text-ink/85">{t(`features.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Полоса преимуществ с цитатой о книгах. */
export async function StripSection() {
  const t = await getTranslations('strip');
  const items = [
    { key: 'selected', Icon: LeafIcon },
    { key: 'delivery', Icon: TruckIcon },
    { key: 'love', Icon: HeartIcon },
  ] as const;

  return (
    <section className="container-page mt-6" aria-label={t('label')}>
      <div className="card relative grid items-center gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,0.9fr)] lg:py-4">
        <ul className="grid gap-5 sm:grid-cols-3">
          {items.map(({ key, Icon }) => (
            <li key={key} className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cocoa-100 text-[#6f7d42]">
                <Icon className="size-5" />
              </span>
              <span className="text-[0.82rem] leading-snug text-ink/85">{t(key)}</span>
            </li>
          ))}
        </ul>
        <Image
          src={booksFlowers}
          alt=""
          width={800}
          height={306}
          sizes="(min-width: 1024px) 18vw, 60vw"
          className="mx-auto hidden h-auto w-56 drop-shadow-md sm:block lg:-my-8 lg:w-40 xl:w-56"
        />
        <blockquote className="flex items-start gap-3 border-t border-sand/60 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <QuoteIcon className="size-6 shrink-0 text-gold" />
          <p className="font-display text-lg leading-snug text-cocoa-700 italic">{t('quote')}</p>
        </blockquote>
      </div>
    </section>
  );
}
