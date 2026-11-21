import { apiFetchPage, safely } from '@/lib/api';
import { type FeaturedCover, normalizeTitle } from '@/lib/featured-covers';
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
export async function FeaturedShelfSection({
  covers,
  title,
  subtitle,
}: {
  covers: FeaturedCover[];
  title: string;
  subtitle: string;
}) {
  if (covers.length === 0) return null;
  const items: FeaturedShelfItem[] = await Promise.all(
    covers.map(async (cover) => {
      const [book, audiobook] = await Promise.all([
        findByTitle('books', cover.title),
        findByTitle('audiobooks', cover.title),
      ]);
      return { cover, book, audiobook };
    }),
  );
  return <FeaturedShelf items={items} title={title} subtitle={subtitle} />;
}
