import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sparkle } from '../ornaments/decor';
import { CornerOrnament } from '../ornaments/ornaments';
import { ArrowRight, buttonClasses } from '../ui/button';
import type { SceneBook } from './hero-books-3d';
import { HeroStage } from './hero-stage';

/** Первый экран по макету: заголовок слева, справа книга-мир на подиуме под аркой. */
export async function Hero({ books }: { books: SceneBook[] }) {
  const t = await getTranslations('hero');

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <CornerOrnament className="pointer-events-none absolute top-24 -left-16 hidden size-44 text-gold/40 md:block" />
      <CornerOrnament className="pointer-events-none absolute -bottom-10 -left-14 size-36 text-gold/30" />

      <div className="container-page grid items-center gap-4 pt-8 pb-10 lg:min-h-[42rem] lg:grid-cols-[1fr_1.12fr] lg:pt-4 lg:pb-6">
        <div className="relative z-10 max-w-[34rem]">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="size-4 text-gold" />
            {t('eyebrow')}
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[2.35rem] leading-[1.1] font-medium tracking-tight text-cocoa sm:text-[3rem] lg:text-[3.35rem]"
          >
            {t('title')}
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-ink/75 sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-8">
            <Link href="/books" className={buttonClasses('primary', 'px-7 py-3.5')}>
              {t('toCatalog')} <ArrowRight />
            </Link>
          </div>
        </div>

        <HeroStage books={books} label={t('sceneLabel')} />
      </div>
    </section>
  );
}
