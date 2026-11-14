'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { LANGUAGES, type NormalizedParams, pageHref, SORTS } from '@/lib/catalog-params';
import { SearchIcon } from '../ui/icons';

const control =
  'w-full rounded-full border border-sand bg-white/75 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';

/**
 * Фильтры каталога: поиск, категория, язык, цена, наличие, сортировка.
 * Меняют адрес страницы — фильтры сохраняются при обновлении и в ссылке.
 */
export function CatalogFilters({
  base,
  params,
  categories,
  withStock,
}: {
  base: string;
  params: NormalizedParams;
  categories: { slug: string; name: string }[];
  withStock: boolean;
}) {
  const t = useTranslations('catalog');
  const router = useRouter();
  const [search, setSearch] = useState(params.search ?? '');
  const [minPrice, setMinPrice] = useState(params.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? '');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const [pending, startTransition] = useTransition();

  const go = (patch: Partial<NormalizedParams>) =>
    startTransition(() => router.push(pageHref(base, params, patch), { scroll: false }));

  return (
    <form
      role="search"
      aria-label={t('filters')}
      onSubmit={(event) => {
        event.preventDefault();
        go({
          search: search.trim() || undefined,
          minPrice: /^\d+$/.test(minPrice) ? minPrice : undefined,
          maxPrice: /^\d+$/.test(maxPrice) ? maxPrice : undefined,
        });
      }}
      // Без JavaScript форма тоже работает: обычный GET с теми же параметрами
      method="get"
      // Отметка для e2e: страница каталога гидратирована
      data-ready={ready || undefined}
      aria-busy={pending}
      className="card grid gap-3 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]"
    >
      <div className="flex gap-2 md:col-span-2 lg:col-span-1">
        <label className="relative flex-1">
          <span className="sr-only">{t('searchPlaceholder')}</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className={`${control} pl-10`}
          />
        </label>
        <button
          type="submit"
          className="magnetic rounded-full bg-cocoa px-5 text-sm font-semibold text-milk hover:bg-cocoa-700"
        >
          {t('search')}
        </button>
      </div>

      {categories.length > 0 && (
        <label>
          <span className="sr-only">{t('category')}</span>
          <select
            name="category"
            value={params.category ?? ''}
            onChange={(event) => go({ category: event.target.value || undefined })}
            className={control}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        <span className="sr-only">{t('language')}</span>
        <select
          name="language"
          value={params.language ?? ''}
          onChange={(event) =>
            go({ language: (event.target.value || undefined) as NormalizedParams['language'] })
          }
          className={control}
        >
          <option value="">{t('anyLanguage')}</option>
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {t(`languages.${language}`)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">{t('sort')}</span>
        <select
          name="sort"
          value={params.sort}
          onChange={(event) => go({ sort: event.target.value as NormalizedParams['sort'] })}
          className={control}
          aria-label={t('sort')}
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sorts.${sort}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex items-center gap-2 md:col-span-2 lg:col-span-2">
        <legend className="sr-only">{t('price')}</legend>
        <span className="shrink-0 text-sm text-ink/75">{t('price')}</span>
        <input
          inputMode="numeric"
          name="minPrice"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))}
          placeholder={t('priceFrom')}
          aria-label={`${t('price')} ${t('priceFrom')}`}
          className={control}
        />
        <span aria-hidden="true">—</span>
        <input
          inputMode="numeric"
          name="maxPrice"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))}
          placeholder={t('priceTo')}
          aria-label={`${t('price')} ${t('priceTo')}`}
          className={control}
        />
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
        {withStock ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="inStock"
              value="true"
              checked={params.inStock === 'true'}
              onChange={(event) => go({ inStock: event.target.checked ? 'true' : undefined })}
              className="size-4 accent-[#3a2416]"
            />
            {t('inStock')}
          </label>
        ) : (
          <span />
        )}
        {pending && (
          <span role="status" className="animate-pulse text-sm text-muted">
            {t('loading')}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setMinPrice('');
            setMaxPrice('');
            startTransition(() => router.push(base, { scroll: false }));
          }}
          className="text-sm font-semibold text-cocoa underline"
        >
          {t('reset')}
        </button>
      </div>
    </form>
  );
}
