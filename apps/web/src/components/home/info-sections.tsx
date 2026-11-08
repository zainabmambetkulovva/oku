import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Butterfly, LeafBranch, Sparkle } from '../ornaments/decor';
import { MountainLandscape } from '../ornaments/landscape';
import { ArrowRight, buttonClasses } from '../ui/button';
import { BookOpenIcon, HeartIcon, LeafIcon, QuoteIcon, SupportIcon, TruckIcon } from '../ui/icons';

/** «Больше, чем просто книги»: окно-арка с горами, текст о магазине и три преимущества. */
export async function AboutSection() {
  const t = await getTranslations('about');
  const features = [
    { key: 'quality', Icon: BookOpenIcon },
    { key: 'delivery', Icon: TruckIcon },
    { key: 'support', Icon: SupportIcon },
  ] as const;

  return (
    <section id="about" className="relative mt-24 scroll-mt-24" aria-labelledby="about-title">
      <div className="container-page grid items-center gap-8 lg:grid-cols-[1.25fr_1fr_0.8fr]">
        {/* Уголок для чтения у окна с видом на горы */}
        <div
          className="relative h-72 overflow-hidden rounded-[2.2rem] bg-gradient-to-b from-[#f6ead9] to-[#e8d5bb] shadow-[var(--shadow-card)] sm:h-80"
          aria-hidden="true"
        >
          <div className="arch absolute top-6 left-1/2 h-[82%] w-[46%] -translate-x-1/2 overflow-hidden border-[8px] border-white/80 shadow-inner">
            <MountainLandscape className="absolute inset-0 size-full" soft />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-[#e3cfb2] to-[#d5bd9b]" />
          <Image
            src="/illustrations/self-development.webp"
            alt=""
            width={720}
            height={512}
            sizes="(min-width: 1024px) 18vw, 40vw"
            className="absolute bottom-3 left-2 h-auto w-[40%]"
          />
          <LeafBranch className="absolute -top-2 -right-4 h-36 w-28" flip />
          <Butterfly className="top-10 left-10 size-8" delay={1.5} />
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
    <section className="container-page mt-14" aria-label={t('label')}>
      <div className="card relative grid items-center gap-6 overflow-hidden px-6 py-6 sm:px-8 lg:grid-cols-[2fr_1fr]">
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
        <blockquote className="flex items-start gap-3 border-t border-sand/60 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <QuoteIcon className="size-6 shrink-0 text-gold" />
          <p className="font-display text-lg leading-snug text-cocoa-700 italic">{t('quote')}</p>
        </blockquote>
      </div>
    </section>
  );
}
