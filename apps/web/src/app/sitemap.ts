import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { apiFetchPage } from '@/lib/api';
import { OFFICIAL_CATEGORIES } from '@/lib/site';
import { siteUrl } from '@/lib/seo';
import type { AudiobookListItem, BookListItem } from '@/lib/types';

// Каталог меняется из админки — карта сайта собирается по запросу
export const dynamic = 'force-dynamic';

async function all<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 40; page++) {
    const result = await apiFetchPage<T>(
      `${path}${path.includes('?') ? '&' : '?'}limit=50&page=${page}`,
    ).catch(() => null);
    if (!result) break;
    items.push(...result.data);
    if (page >= result.meta.totalPages) break;
  }
  return items;
}

/** Все языковые версии адреса с hreflang. */
function entry(
  path: string,
  options: Partial<MetadataRoute.Sitemap[number]> = {},
): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = Object.fromEntries(
    routing.locales.map((code) => [code, `${base}/${code}${path}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${base}/${locale}${path}`,
    alternates: { languages },
    ...options,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, audiobooks] = await Promise.all([
    all<BookListItem>('/books?sort=newest'),
    all<AudiobookListItem>('/audiobooks?sort=newest'),
  ]);
  return [
    ...entry('', { changeFrequency: 'daily', priority: 1 }),
    ...entry('/books', { changeFrequency: 'daily', priority: 0.9 }),
    ...entry('/audiobooks', { changeFrequency: 'daily', priority: 0.9 }),
    ...OFFICIAL_CATEGORIES.filter((category) => category.key !== 'audiobooks').flatMap((category) =>
      entry(`/books?category=${category.key}`, { changeFrequency: 'daily', priority: 0.8 }),
    ),
    ...['/community', '/about', '/contacts', '/delivery', '/privacy', '/terms'].flatMap((path) =>
      entry(path, { changeFrequency: 'monthly', priority: 0.5 }),
    ),
    ...books.flatMap((book) =>
      entry(`/books/${book.slug}`, {
        lastModified: book.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
    ...audiobooks.flatMap((item) =>
      entry(`/audiobooks/${item.slug}`, {
        lastModified: item.createdAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
  ];
}
