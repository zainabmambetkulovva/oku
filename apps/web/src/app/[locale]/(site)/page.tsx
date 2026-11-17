import { alternates } from '@/lib/seo';
import { setRequestLocale } from 'next-intl/server';
import { CategoriesSection } from '@/components/home/categories-section';
import { CommunitySection, ReviewsSection } from '@/components/home/community-sections';
import { FeaturedShelfSection } from '@/components/home/featured-shelf-section';
import { Hero } from '@/components/home/hero';
import { AboutSection, StripSection } from '@/components/home/info-sections';
import { InteractiveTeaser } from '@/components/community/interactive-teaser';
import { QuoteOfDayBlock } from '@/components/community/quote-of-day';
import { PlayerSection, showcaseAudiobooks } from '@/components/home/player-section';
import {
  AudiobooksSection,
  BestsellersSection,
  NewBooksSection,
} from '@/components/home/products-section';
import { Reveal } from '@/components/ui/reveal';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type {
  AudiobookDetails,
  AudiobookListItem,
  BookListItem,
  CategoryNode,
  LatestReview,
  QuoteOfDay,
} from '@/lib/types';

// Каталог меняется из админки — страница собирается на каждый запрос (ответы API кэшируются в Redis)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { alternates: alternates(locale, '/') };
}

const empty = { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };

/**
 * Главная по утверждённому макету (первый экран, категории, бестселлеры, «О нас»,
 * преимущества, отзывы, сообщество) и разделы из ТЗ 2.4 в том же стиле:
 * новинки, аудиокниги с плеером; подписка — в подвале.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, popular, fresh, audiobooks, reviews, quote] = await Promise.all([
    safely(() => apiFetch<CategoryNode[]>('/categories'), [], 'categories'),
    safely(
      () => apiFetchPage<BookListItem>('/books?sort=popular&limit=12'),
      empty,
      'popular books',
    ),
    safely(() => apiFetchPage<BookListItem>('/books?sort=newest&limit=10'), empty, 'new books'),
    safely(
      () => apiFetchPage<AudiobookListItem>('/audiobooks?sort=popular&limit=4'),
      empty,
      'audiobooks',
    ),
    safely(() => apiFetch<LatestReview[]>('/reviews/latest?limit=9'), [], 'latest reviews'),
    safely(() => apiFetch<QuoteOfDay | null>(`/quotes/today?locale=${locale}`), null, 'quote'),
  ]);

  const showcase = await showcaseAudiobooks(audiobooks.data, (slug) =>
    safely(
      () => apiFetch<AudiobookDetails>(`/audiobooks/${encodeURIComponent(slug)}`),
      null,
      'showcase audiobook',
    ),
  );

  return (
    <>
      <Hero />
      <FeaturedShelfSection />
      <Reveal>
        <CategoriesSection categories={categories} />
      </Reveal>
      <Reveal>
        <BestsellersSection books={popular.data} />
      </Reveal>
      <Reveal>
        <AboutSection />
      </Reveal>
      <Reveal>
        <StripSection />
      </Reveal>
      <Reveal>
        <NewBooksSection books={fresh.data} />
      </Reveal>
      <Reveal>
        <AudiobooksSection audiobooks={audiobooks.data} />
      </Reveal>
      <Reveal>
        <PlayerSection audiobooks={showcase} />
      </Reveal>
      <Reveal>
        <QuoteOfDayBlock quote={quote} />
      </Reveal>
      <Reveal>
        <InteractiveTeaser />
      </Reveal>
      <Reveal>
        <ReviewsSection reviews={reviews} />
      </Reveal>
      <Reveal>
        <CommunitySection />
      </Reveal>
    </>
  );
}
