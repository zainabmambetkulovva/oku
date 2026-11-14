import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogView } from '@/components/catalog/catalog-view';
import { BookCard } from '@/components/catalog/product-card';
import { apiFetch, apiFetchPage, safely } from '@/lib/api';
import { apiQuery, type CatalogParams, normalizeParams } from '@/lib/catalog-params';
import { OFFICIAL_CATEGORIES } from '@/lib/site';
import type { BookListItem, CategoryDetails, CategoryNode, Paginated } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogParams>;
};

/** Официальные категории печатных книг (без аудиокниг) с названиями из админки, если они созданы. */
async function bookCategories(t: (key: string) => string) {
  const tree = await safely(() => apiFetch<CategoryNode[]>('/categories'), [], 'categories');
  const flat = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes.flatMap((node) => [node, ...flat(node.children)]);
  const existing = flat(tree);
  return OFFICIAL_CATEGORIES.filter((category) => category.key !== 'audiobooks').map(
    (category) => ({
      slug: category.key,
      name: existing.find((item) => item.slug === category.key)?.name ?? t(category.key),
    }),
  );
}

async function categoryInfo(slug?: string) {
  if (!slug) return null;
  return safely(() => apiFetch<CategoryDetails>(`/categories/${slug}`), null, 'category');
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = normalizeParams(await searchParams);
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const tc = await getTranslations({ locale, namespace: 'categories.defaults' });
  const category = await categoryInfo(query.category);
  const fallback = query.category && tc.has(query.category) ? tc(query.category) : null;
  return {
    title: category?.name ?? fallback ?? t('booksTitle'),
    description: category?.description ?? t('booksLead'),
  };
}

/** Каталог печатных книг: категория, поиск, фильтры, сортировка, страницы. */
export default async function BooksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = normalizeParams(await searchParams);
  const t = await getTranslations('catalog');
  const tc = await getTranslations('categories.defaults');

  const [categories, category, books] = await Promise.all([
    bookCategories((key) => tc(key)),
    categoryInfo(query.category),
    apiFetchPage<BookListItem>(`/books?${apiQuery(query, 'books')}`).catch(
      () => null as Paginated<BookListItem> | null,
    ),
  ]);
  const official = query.category ? categories.find((item) => item.slug === query.category) : null;

  return (
    <CatalogView
      base="/books"
      title={category?.name ?? official?.name ?? t('booksTitle')}
      lead={query.category ? category?.description : t('booksLead')}
      params={query}
      categories={categories}
      total={books ? books.meta.total : null}
      totalPages={books?.meta.totalPages ?? 0}
    >
      {books?.data.map((book) => (
        <li key={book.id}>
          <BookCard book={book} />
        </li>
      ))}
    </CatalogView>
  );
}
