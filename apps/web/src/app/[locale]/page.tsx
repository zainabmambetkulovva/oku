import { setRequestLocale } from 'next-intl/server';
import { CategoriesSection } from '@/components/home/categories-section';
import { Hero } from '@/components/home/hero';
import { AboutSection, AdvantagesSection, DeliverySection } from '@/components/home/info-sections';
import { Newsletter } from '@/components/home/newsletter';
import { PlayerSection } from '@/components/home/player-section';
import { AudiobooksSection, BooksSection } from '@/components/home/products-section';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import type {
  AudiobookDetails,
  AudiobookListItem,
  BookListItem,
  CategoryNode,
  DeliveryOption,
} from '@/lib/types';
import { getTranslations } from 'next-intl/server';

// Каталог меняется из админки — страница собирается на каждый запрос (ответы API кэшируются в Redis)
export const dynamic = 'force-dynamic';

const empty = { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sections');

  const [categories, popular, fresh, audiobooks, delivery] = await Promise.all([
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
    safely(() => apiFetch<DeliveryOption[]>('/orders/delivery-options'), [], 'delivery options'),
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

  const sceneBooks = (popular.data.length ? popular.data : fresh.data)
    .slice(0, 5)
    .map(({ slug, title, author }) => ({ slug, title, author }));

  return (
    <>
      <Hero books={sceneBooks} />
      <CategoriesSection categories={categories} />
      <BooksSection
        id="popular-title"
        title={t('popular')}
        href="/books?sort=popular"
        books={popular.data}
      />
      <BooksSection
        id="new-title"
        title={t('new')}
        href="/books?sort=newest"
        books={fresh.data}
        layout="row"
      />
      <AudiobooksSection
        id="audiobooks-title"
        title={t('audiobooks')}
        href="/audiobooks"
        audiobooks={audiobooks.data}
      />
      <PlayerSection audiobook={featuredDetails} />
      <AboutSection />
      <AdvantagesSection />
      <DeliverySection options={delivery} />
      <Newsletter />
    </>
  );
}
