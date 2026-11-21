import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookCard } from '@/components/catalog/product-card';
import { FeaturedShelfSection } from '@/components/home/featured-shelf-section';
import { Butterfly, Sparkle } from '@/components/ornaments/decor';
import { ArrowRight, buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiFetchPage, safely } from '@/lib/api';
import { KIDS_COVERS } from '@/lib/featured-covers';
import { alternates } from '@/lib/seo';
import type { BookListItem } from '@/lib/types';

// Каталог меняется из админки — страница собирается на каждый запрос
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kidsPage' });
  return { title: t('title'), description: t('lead'), alternates: alternates(locale, '/kids') };
}

/**
 * Детский раздел — отдельно от остального магазина (основной сайт для взрослых):
 * витрина детских книг и детские книги из каталога (категория kids).
 */
export default async function KidsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('kidsPage');
  const books = await safely(
    () => apiFetchPage<BookListItem>('/books?category=kids&sort=newest&limit=12'),
    null,
    'kids books',
  );

  return (
    <>
      <section className="relative container-page pt-8 pb-2" aria-labelledby="kids-title">
        <Butterfly className="top-6 right-[12%] size-10" delay={1} />
        <p className="eyebrow flex items-center gap-2">
          <Sparkle className="size-4 text-gold" />
          {t('eyebrow')}
        </p>
        <h1
          id="kids-title"
          className="mt-4 text-[2.2rem] leading-tight font-medium text-cocoa sm:text-[2.8rem]"
        >
          {t('title')}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/75">{t('lead')}</p>
      </section>

      <FeaturedShelfSection
        covers={KIDS_COVERS}
        title={t('shelfTitle')}
        subtitle={t('shelfSubtitle')}
      />

      <section className="container-page mt-14" aria-labelledby="kids-catalog-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2
            id="kids-catalog-title"
            className="text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('catalogTitle')}
          </h2>
          <Link href="/books?category=kids" className={buttonClasses('outline')}>
            {t('toCatalog')} <ArrowRight />
          </Link>
        </div>
        {books && books.data.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.data.map((book) => (
              <li key={book.id}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card mt-6 p-8 text-center text-muted">{t('empty')}</p>
        )}
      </section>
    </>
  );
}
