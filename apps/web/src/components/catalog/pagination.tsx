import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { type NormalizedParams, pageHref } from '@/lib/catalog-params';

/** Переключение страниц каталога обычными ссылками (работает и без JavaScript). */
export async function Pagination({
  base,
  params,
  totalPages,
}: {
  base: string;
  params: NormalizedParams;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations('catalog');
  const page = Number(params.page);
  const link =
    'rounded-full border border-sand bg-white/70 px-5 py-2 text-sm font-semibold text-cocoa transition hover:bg-white';

  return (
    <nav
      aria-label={t('page', { page, total: totalPages })}
      className="mt-10 flex items-center justify-center gap-4"
    >
      {page > 1 ? (
        <Link
          href={pageHref(base, params, { page: String(page - 1) })}
          className={link}
          rel="prev"
          prefetch={false}
        >
          ← {t('prev')}
        </Link>
      ) : (
        <span className={`${link} opacity-40`} aria-hidden="true">
          ← {t('prev')}
        </span>
      )}
      <span className="text-sm text-ink/75">{t('page', { page, total: totalPages })}</span>
      {page < totalPages ? (
        <Link
          href={pageHref(base, params, { page: String(page + 1) })}
          className={link}
          rel="next"
          prefetch={false}
        >
          {t('next')} →
        </Link>
      ) : (
        <span className={`${link} opacity-40`} aria-hidden="true">
          {t('next')} →
        </span>
      )}
    </nav>
  );
}
