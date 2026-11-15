import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AudiobookShowcase } from '@/components/community/audiobook-showcase';
import { BlindDate } from '@/components/community/blind-date';
import { BookQuiz } from '@/components/community/book-quiz';
import { QuoteOfDayBlock } from '@/components/community/quote-of-day';
import { ReviewsGrid } from '@/components/community/reviews-grid';
import { CommunitySection } from '@/components/home/community-sections';
import { showcaseAudiobooks } from '@/components/home/player-section';
import { Butterfly, Sparkle } from '@/components/ornaments/decor';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type { AudiobookDetails, AudiobookListItem, LatestReview, QuoteOfDay } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'communityPage' });
  return { title: t('title'), description: t('lead') };
}

/** «Сообщество»: цитата дня, тест подбора книги, свидание вслепую, аудиовитрина, отзывы. */
export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('communityPage');
  const [quote, reviews, audiobooks] = await Promise.all([
    safely(() => apiFetch<QuoteOfDay | null>(`/quotes/today?locale=${locale}`), null, 'quote'),
    safely(() => apiFetch<LatestReview[]>('/reviews/latest?limit=12'), [], 'latest reviews'),
    safely(
      () => apiFetchPage<AudiobookListItem>('/audiobooks?sort=popular&limit=8'),
      null,
      'audiobooks',
    ),
  ]);
  const showcase = await showcaseAudiobooks(audiobooks?.data ?? [], (slug) =>
    safely(
      () => apiFetch<AudiobookDetails>(`/audiobooks/${encodeURIComponent(slug)}`),
      null,
      'audiobook',
    ),
  );

  return (
    <div className="relative overflow-x-clip pb-6">
      <Butterfly className="top-24 right-[8%] size-10" />
      <header className="container-page pt-10 sm:pt-14">
        <p className="eyebrow flex items-center gap-2">
          <Sparkle className="size-4 text-gold" />
          OKU24
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-medium text-cocoa sm:text-[2.8rem]">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-2xl text-ink/75">{t('lead')}</p>
      </header>

      <QuoteOfDayBlock quote={quote} />

      <div className="container-page mt-12 grid gap-8 lg:grid-cols-2">
        <BookQuiz />
        <BlindDate />
      </div>

      {showcase.length > 0 && (
        <section className="container-page mt-14" aria-labelledby="showcase-title">
          <h2
            id="showcase-title"
            className="text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('showcaseTitle')}
          </h2>
          <p className="mt-2 mb-6 text-sm text-ink/70">{t('showcaseText')}</p>
          <AudiobookShowcase audiobooks={showcase} />
        </section>
      )}

      <section className="container-page mt-14" aria-labelledby="community-reviews-title">
        <h2
          id="community-reviews-title"
          className="mb-6 text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
        >
          {t('reviewsTitle')}
        </h2>
        <ReviewsGrid reviews={reviews} />
      </section>

      <CommunitySection />
    </div>
  );
}
