import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { NormalizedParams } from '@/lib/catalog-params';
import { Sparkle } from '../ornaments/decor';
import { CornerOrnament } from '../ornaments/ornaments';
import { Reveal } from '../ui/reveal';
import { CatalogFilters } from './catalog-filters';
import { Pagination } from './pagination';

interface CatalogViewProps {
  base: '/books' | '/audiobooks';
  title: string;
  lead?: string | null;
  params: NormalizedParams;
  categories: { slug: string; name: string }[];
  /** null — каталог не загрузился */
  total: number | null;
  totalPages: number;
  children: React.ReactNode;
}

/** Общий вид каталога: заголовок, фильтры, число найденных, сетка, страницы, пустое и ошибочное состояние. */
export async function CatalogView({
  base,
  title,
  lead,
  params,
  categories,
  total,
  totalPages,
  children,
}: CatalogViewProps) {
  const t = await getTranslations('catalog');
  const found = base === '/books' ? 'found' : 'foundAudio';

  return (
    <div className="relative overflow-x-clip pb-6">
      <CornerOrnament className="pointer-events-none absolute top-6 -left-16 hidden size-44 text-gold/35 md:block" />
      <header className="container-page pt-10 pb-6 text-center sm:pt-14">
        <Sparkle className="mx-auto size-5 text-gold" />
        <h1 className="mt-3 text-[2.2rem] leading-tight font-medium text-cocoa sm:text-[2.8rem]">
          {title}
        </h1>
        <span className="mx-auto mt-3 block h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
        {params.search && (
          <p className="mt-4 text-sm text-ink/70">{t('searchFor', { query: params.search })}</p>
        )}
        {lead && <p className="mx-auto mt-4 max-w-2xl text-base text-ink/75">{lead}</p>}
      </header>

      <div className="container-page">
        <CatalogFilters
          base={base}
          params={params}
          categories={categories}
          withStock={base === '/books'}
        />

        {total === null ? (
          <div className="card mt-8 p-10 text-center" role="alert">
            <p className="text-sm text-ink/75">{t('error')}</p>
            <Link
              href={base}
              className="mt-4 inline-block text-sm font-semibold text-cocoa underline"
            >
              {t('retry')}
            </Link>
          </div>
        ) : total === 0 ? (
          <div className="card mt-8 p-10 text-center" data-testid="catalog-empty">
            <p className="text-sm text-ink/75">{t('empty')}</p>
            <Link
              href={base}
              className="mt-4 inline-block text-sm font-semibold text-cocoa underline"
            >
              {t('reset')}
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 mb-4 text-sm text-ink/70" data-testid="catalog-count">
              {t(found, { count: total })}
            </p>
            <Reveal>
              <ul
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
                data-testid="catalog-grid"
              >
                {children}
              </ul>
            </Reveal>
            <Pagination base={base} params={params} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
