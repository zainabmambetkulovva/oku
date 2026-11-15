import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Butterfly, Sparkle } from '../ornaments/decor';
import { ArrowRight, buttonClasses } from '../ui/button';

/** Приглашение на главной: тест подбора книги и «свидание вслепую». */
export async function InteractiveTeaser() {
  const t = await getTranslations('communityPage');
  return (
    <section
      className="relative container-page mt-14 overflow-x-clip"
      aria-labelledby="interactive-title"
    >
      <Butterfly className="top-2 right-[12%] size-8" delay={1.5} />
      <div className="card grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2
            id="interactive-title"
            className="flex items-center gap-2 text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
          >
            <Sparkle className="size-5 text-gold" />
            {t('interactiveTitle')}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-ink/75">{t('interactiveText')}</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/community#quiz" className={buttonClasses('primary', 'magnetic')}>
            {t('toQuiz')} <ArrowRight />
          </Link>
          <Link href="/community#blind-date" className={buttonClasses('outline', 'magnetic')}>
            {t('toBlindDate')}
          </Link>
        </div>
      </div>
    </section>
  );
}
