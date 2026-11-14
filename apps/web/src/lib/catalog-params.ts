/** Параметры каталога из адресной строки → запрос к API. Цены в адресе — в сомах. */
export interface CatalogParams {
  search?: string;
  category?: string;
  language?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export const SORTS = ['newest', 'popular', 'price_asc', 'price_desc', 'title'] as const;
export const LANGUAGES = ['ky', 'ru', 'en'] as const;
export const PAGE_SIZE = 12;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const som = (value?: string) =>
  value && /^\d{1,7}$/.test(value) ? String(Number(value) * 100) : undefined;

/** Только допустимые значения — остальное отбрасывается, чтобы API не вернул 400. */
export function normalizeParams(raw: CatalogParams) {
  const page = raw.page && /^\d{1,4}$/.test(raw.page) && Number(raw.page) > 0 ? raw.page : '1';
  const limit =
    raw.limit && /^\d{1,2}$/.test(raw.limit) && Number(raw.limit) >= 1 && Number(raw.limit) <= 48
      ? raw.limit
      : String(PAGE_SIZE);
  return {
    search: raw.search?.trim().slice(0, 100) || undefined,
    category: raw.category && SLUG.test(raw.category) ? raw.category : undefined,
    language: LANGUAGES.find((value) => value === raw.language),
    minPrice: raw.minPrice && /^\d{1,7}$/.test(raw.minPrice) ? raw.minPrice : undefined,
    maxPrice: raw.maxPrice && /^\d{1,7}$/.test(raw.maxPrice) ? raw.maxPrice : undefined,
    inStock: raw.inStock === 'true' ? 'true' : undefined,
    sort: SORTS.find((value) => value === raw.sort) ?? 'newest',
    page,
    limit,
  };
}

export type NormalizedParams = ReturnType<typeof normalizeParams>;

/** Строка запроса к API каталога. */
export function apiQuery(params: NormalizedParams, kind: 'books' | 'audiobooks'): string {
  const query = new URLSearchParams({ sort: params.sort, page: params.page, limit: params.limit });
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.language) query.set('language', params.language);
  const min = som(params.minPrice);
  const max = som(params.maxPrice);
  if (min) query.set('minPrice', min);
  if (max) query.set('maxPrice', max);
  if (kind === 'books' && params.inStock) query.set('inStock', 'true');
  return query.toString();
}

/** Адрес страницы каталога с изменёнными параметрами (страница сбрасывается, если не задана). */
export function pageHref(base: string, params: NormalizedParams, patch: Partial<NormalizedParams>) {
  const next = { ...params, page: '1', ...patch };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (!value) continue;
    if (key === 'sort' && value === 'newest') continue;
    if (key === 'page' && value === '1') continue;
    if (key === 'limit' && value === String(PAGE_SIZE)) continue;
    query.set(key, value);
  }
  const string = query.toString();
  return string ? `${base}?${string}` : base;
}
