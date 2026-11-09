import { setRequestLocale } from 'next-intl/server';
import { CategoriesSection } from '@/components/home/categories-section';
import { CommunitySection, ReviewsSection } from '@/components/home/community-sections';
import { Hero } from '@/components/home/hero';
import { AboutSection, StripSection } from '@/components/home/info-sections';
import { Newsletter } from '@/components/home/newsletter';
import { PlayerSection } from '@/components/home/player-section';
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
} from '@/lib/types';

// Каталог меняется из админки — страница собирается на каждый запрос (ответы API кэшируются в Redis)
export const dynamic = 'force-dynamic';

const empty = { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };

/**
 * Главная по утверждённому макету (первый экран, категории, бестселлеры, «О нас»,
 * преимущества, отзывы, сообщество) и разделы из ТЗ 2.4 в том же стиле:
 * новинки, аудиокниги с плеером, подписка.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, popular, fresh, audiobooks, reviews] = await Promise.all([
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
  ]);

  const featured =
    audiobooks.data.find((audiobook) => audiobook.hasFreePreview) ?? audiobooks.data[0];
  const featuredDetails = featured
    ? await safely(
        () => apiFetch<AudiobookDetails>(`/audiobooks/${encodeURIComponent(featured.slug)}`),
        null,
        'featured audiobook',
      )
    : null;

  return (
    <>
      <Hero />
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
        <PlayerSection audiobook={featuredDetails} />
      </Reveal>
      <Reveal>
        <ReviewsSection reviews={reviews} />
      </Reveal>
      <Reveal>
        <CommunitySection />
      </Reveal>
      <Reveal>
        <Newsletter />
      </Reveal>
    </>
  );
}
