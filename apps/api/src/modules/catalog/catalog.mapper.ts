import { Category } from '@prisma/client';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export const categorySummarySelect = { id: true, name: true, slug: true } as const;

export function toCategorySummaries(
  links: { category: Pick<Category, 'id' | 'name' | 'slug' | 'isActive'> }[],
): CategorySummary[] {
  return links
    .filter(({ category }) => category.isActive)
    .map(({ category }) => ({ id: category.id, name: category.name, slug: category.slug }));
}

/** Условие поиска по части названия или автора (индексы pg_trgm). */
export function searchWhere(search: string | undefined) {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { author: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

export function priceWhere(minPrice?: number, maxPrice?: number) {
  if (minPrice === undefined && maxPrice === undefined) {
    return {};
  }
  return { price: { gte: minPrice, lte: maxPrice } };
}
