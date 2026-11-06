import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CornerOrnament } from '../ornaments/ornaments';
import { MountainLandscape } from '../ornaments/landscape';
import { ArrowRight, buttonClasses } from '../ui/button';
import type { SceneBook } from './hero-books-3d';
import { HeroScene } from './hero-scene';

export async function Hero({ books }: { books: SceneBook[] }) {
  const t = await getTranslations('hero');

  return (
    <section
      className="relative isolate overflow-hidden rounded-b-[2.5rem] border-b border-sand/60 bg-cream"
      aria-labelledby="hero-title"
    >
      <MountainLandscape className="absolute inset-0 -z-10 size-full" />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-milk via-milk/80 to-transparent lg:via-milk/55"
        aria-hidden="true"
      />
      <CornerOrnament className="pointer-events-none absolute -top-12 -left-12 hidden size-48 text-gold/45 sm:block" />
      <CornerOrnament className="pointer-events-none absolute -bottom-14 -left-14 size-40 text-gold/35" />

      <div className="container-page grid min-h-[34rem] items-center gap-6 py-12 lg:min-h-[38rem] lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div className="relative z-10 max-w-xl">
          <h1
            id="hero-title"
            className="text-[2.6rem] leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-[4.2rem]"
          >
            {t('title')}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink/80 sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/books" className={buttonClasses('primary')}>
              {t('toCatalog')} <ArrowRight />
            </Link>
            <Link href="/#player" className={buttonClasses('outline')}>
              {t('listen')}
            </Link>
          </div>
        </div>
        <div className="relative h-[19rem] sm:h-[24rem] lg:h-[32rem]">
          <HeroScene books={books} label={t('sceneLabel')} />
        </div>
      </div>
    </section>
  );
}
