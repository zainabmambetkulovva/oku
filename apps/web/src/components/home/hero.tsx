import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sparkle } from '../ornaments/decor';
import { CornerOrnament } from '../ornaments/ornaments';
import { ArrowRight, buttonClasses } from '../ui/button';
import { HeroStage } from './hero-stage';

/** Первый экран по макету: заголовок слева, справа книга-мир на подиуме под аркой. */
export async function Hero() {
  const t = await getTranslations('hero');

  return (
    <section className="relative isolate overflow-x-clip pb-8" aria-labelledby="hero-title">
      <CornerOrnament className="pointer-events-none absolute top-24 -left-16 hidden size-44 text-gold/40 md:block" />
      <CornerOrnament className="pointer-events-none absolute -bottom-10 -left-14 size-36 text-gold/30" />

      <div className="container-page grid items-center gap-2 pt-6 pb-4 lg:min-h-[36rem] lg:grid-cols-[0.95fr_1.3fr] lg:pt-0 lg:pb-0">
        <div className="relative z-10 max-w-[40rem]">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="size-4 text-gold" />
            {t('eyebrow')}
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[2.2rem] leading-[1.08] font-medium tracking-tight text-cocoa sm:text-[2.7rem] lg:text-[2.75rem] xl:text-[3rem]"
          >
            {t('title')}
          </h1>
          <p className="mt-5 max-w-md font-display text-lg leading-snug text-cocoa-700 italic sm:text-xl">
            {t('subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/books" className={buttonClasses('primary', 'magnetic px-7 py-3.5')}>
              {t('explore')} <ArrowRight />
            </Link>
            <Link href="/about" className={buttonClasses('outline', 'magnetic px-7 py-3.5')}>
              {t('aboutUs')}
            </Link>
          </div>
        </div>

        <HeroStage label={t('sceneLabel')} />
      </div>
    </section>
  );
}
