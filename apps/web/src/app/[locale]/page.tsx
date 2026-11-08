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

  const shelf = popular.data.length ? popular.data : fresh.data;
  const sceneBooks = shelf.slice(0, 2).map(({ slug, title, author }) => ({ slug, title, author }));

  return (
    <>
      <Hero books={sceneBooks} />
      <CategoriesSection categories={categories} />
      <BestsellersSection books={popular.data} />
      <NewBooksSection books={fresh.data} />
      <AboutSection />
      <StripSection />
      <AudiobooksSection audiobooks={audiobooks.data} />
      <PlayerSection audiobook={featuredDetails} />
      <ReviewsSection reviews={reviews} />
      <CommunitySection
        books={shelf.slice(2, 6).length === 4 ? shelf.slice(2, 6) : shelf.slice(0, 4)}
      />
      <Newsletter />
    </>
  );
}
