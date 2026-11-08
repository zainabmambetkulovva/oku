import { setRequestLocale } from 'next-intl/server';
import { CategoriesSection } from '@/components/home/categories-section';
import { CommunitySection, ReviewsSection } from '@/components/home/community-sections';
import { Hero } from '@/components/home/hero';
import { AboutSection, StripSection } from '@/components/home/info-sections';
import { BestsellersSection } from '@/components/home/products-section';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type { BookListItem, CategoryNode, LatestReview } from '@/lib/types';

// Каталог меняется из админки — страница собирается на каждый запрос (ответы API кэшируются в Redis)
export const dynamic = 'force-dynamic';

const empty = { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };

/**
 * Главная — точно по утверждённому макету: первый экран, категории, книги, которые
 * выбирают читатели, «О нас», полоса преимуществ, отзывы, сообщество.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, popular, reviews] = await Promise.all([
    safely(() => apiFetch<CategoryNode[]>('/categories'), [], 'categories'),
    safely(
      () => apiFetchPage<BookListItem>('/books?sort=popular&limit=12'),
      empty,
      'popular books',
    ),
    safely(() => apiFetch<LatestReview[]>('/reviews/latest?limit=9'), [], 'latest reviews'),
  ]);

  return (
    <>
      <Hero />
      <CategoriesSection categories={categories} />
      <BestsellersSection books={popular.data} />
      <AboutSection />
      <StripSection />
      <ReviewsSection reviews={reviews} />
      <CommunitySection />
    </>
  );
}
