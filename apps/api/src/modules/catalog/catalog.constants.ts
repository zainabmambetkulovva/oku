/** Языки книг и аудиокниг (ограничение и в БД). */
export const LANGUAGES = ['ru', 'ky', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CATALOG_SORTS = ['newest', 'popular', 'price_asc', 'price_desc', 'title'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** Время жизни записей публичного каталога в кэше. */
export const CATALOG_CACHE_TTL_SECONDS = 60;

/** Цены — целые числа в тыйынах (1 сом = 100 тыйын). Верхняя граница — 1 000 000 сом. */
export const MAX_PRICE = 100_000_000;

export const SIMILAR_LIMIT = 8;

export function catalogOrderBy(sort: CatalogSort) {
  switch (sort) {
    case 'popular':
      return [
        { salesCount: 'desc' as const },
        { createdAt: 'desc' as const },
        { id: 'asc' as const },
      ];
    case 'price_asc':
      return [{ price: 'asc' as const }, { id: 'asc' as const }];
    case 'price_desc':
      return [{ price: 'desc' as const }, { id: 'asc' as const }];
    case 'title':
      return [{ title: 'asc' as const }, { id: 'asc' as const }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' as const }, { id: 'asc' as const }];
  }
}
