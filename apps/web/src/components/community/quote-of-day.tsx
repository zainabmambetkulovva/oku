import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { QuoteOfDay } from '@/lib/types';
import { Sparkle } from '../ornaments/decor';
import { CornerOrnament } from '../ornaments/ornaments';

/** Цитата дня (из админки). Без цитат блок не показывается. */
export async function QuoteOfDayBlock({ quote }: { quote: QuoteOfDay | null }) {
  if (!quote) return null;
  const t = await getTranslations('communityPage');
  const source = quote.book?.title ?? quote.source;

  return (
    <section
      className="container-page mt-14"
      aria-labelledby="quote-title"
      data-testid="quote-of-day"
    >
      <figure className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3a2416] to-[#5b3a24] px-6 py-10 text-center text-milk shadow-[var(--shadow-card)] sm:px-14 sm:py-14">
        <CornerOrnament className="pointer-events-none absolute -top-8 -left-8 size-32 text-gold/30" />
        <CornerOrnament className="pointer-events-none absolute -right-8 -bottom-8 size-32 rotate-180 text-gold/30" />
        <h2
          id="quote-title"
          className="flex items-center justify-center gap-2 font-sans text-xs font-semibold tracking-[0.3em] text-gold-light uppercase"
        >
          <Sparkle className="size-3.5" />
          {t('quoteTitle')}
          <Sparkle className="size-3.5" />
        </h2>
        <blockquote
          className="mx-auto mt-6 max-w-3xl font-display text-[1.45rem] leading-snug sm:text-[1.9rem]"
          lang={quote.locale}
        >
          «{quote.text}»
        </blockquote>
        <figcaption className="mt-6 text-sm text-milk/80">
          — {quote.author}
          {source && (
            <>
              ,{' '}
              {quote.book ? (
                <Link
                  href={`/books/${quote.book.slug}`}
                  className="underline underline-offset-2 hover:text-gold-light"
                >
                  {t('quoteFrom', { title: source })}
                </Link>
              ) : (
                t('quoteFrom', { title: source })
              )}
            </>
          )}
        </figcaption>
      </figure>
    </section>
  );
}
