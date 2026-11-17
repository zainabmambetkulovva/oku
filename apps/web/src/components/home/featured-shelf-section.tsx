import { apiFetchPage, safely } from '@/lib/api';
import { FEATURED_COVERS, normalizeTitle } from '@/lib/featured-covers';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { FeaturedShelf, type FeaturedProduct, type FeaturedShelfItem } from './featured-shelf';

/** Товар каталога с точно таким же названием (поиск API ищет по вхождению). */
async function findByTitle(
  kind: 'books' | 'audiobooks',
  title: string,
): Promise<FeaturedProduct | null> {
  const page = await safely(
    () =>
      apiFetchPage<BookListItem | AudiobookListItem>(
        `/${kind}?search=${encodeURIComponent(title)}&limit=10`,
      ),
    null,
    `featured ${kind}`,
  );
  const wanted = normalizeTitle(title);
  const match = page?.data.find((item) => normalizeTitle(item.title) === wanted);
  return match ? { slug: match.slug, price: match.price } : null;
}

/**
 * Витрина присланных обложек на главной. Цены и ссылки — только из каталога:
 * если книги или аудиокниги с таким названием нет, кнопка для неё не показывается.
 */
export async function FeaturedShelfSection() {
  const items: FeaturedShelfItem[] = await Promise.all(
    FEATURED_COVERS.map(async (cover) => {
      const [book, audiobook] = await Promise.all([
        findByTitle('books', cover.title),
        findByTitle('audiobooks', cover.title),
      ]);
      return { cover, book, audiobook };
    }),
  );
  return <FeaturedShelf items={items} />;
}
