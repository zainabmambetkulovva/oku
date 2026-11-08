import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { AudiobookCard, BookCard } from '../catalog/product-card';
import { CornerOrnament } from '../ornaments/ornaments';
import { Sparkle } from '../ornaments/decor';
import { ArrowRight, buttonClasses } from '../ui/button';
import { Carousel } from '../ui/carousel';
import { SectionHeading } from '../ui/section-heading';

const SLIDE = 'w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.6%]';

async function ViewAll({ href }: { href: string }) {
  const t = await getTranslations('sections');
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cocoa hover:text-gold-dark"
    >
      {t('viewAll')} <ArrowRight />
    </Link>
  );
}

async function EmptyShelf() {
  const t = await getTranslations('sections');
  return <p className="card p-8 text-center text-muted">{t('empty')}</p>;
}

/** «Книги, которые выбирают читатели»: текст слева, лента популярных книг справа. */
export async function BestsellersSection({ books }: { books: BookListItem[] }) {
  const t = await getTranslations('sections');
  const th = await getTranslations('hero');

  return (
    <section className="relative mt-20" aria-labelledby="popular-title">
      <CornerOrnament className="pointer-events-none absolute top-0 -left-16 hidden size-40 text-gold/30 lg:block" />
      <div className="container-page grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2.15fr)]">
        <div>
          <h2
            id="popular-title"
            className="text-[1.75rem] leading-tight font-medium text-cocoa sm:text-[2.05rem]"
          >
            <Sparkle className="mr-2 inline size-5 align-baseline text-gold" />
            {t('bestsellers')}
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/70">
            {t('bestsellersSubtitle')}
          </p>
          <Link href="/books?sort=popular" className={buttonClasses('primary', 'mt-6')}>
            {th('toCatalog')} <ArrowRight />
          </Link>
        </div>
        {books.length === 0 ? (
          <EmptyShelf />
        ) : (
          <Carousel prevLabel={t('prev')} nextLabel={t('next')}>
            {books.map((book) => (
              <li key={book.id} className={SLIDE}>
                <BookCard book={book} />
              </li>
            ))}
          </Carousel>
        )}
      </div>
    </section>
  );
}

/** Новинки — лента с заголовком слева (ТЗ 2.4, п. 5). */
export async function NewBooksSection({ books }: { books: BookListItem[] }) {
  const t = await getTranslations('sections');
  if (books.length === 0) return null;
  return (
    <section className="container-page mt-20" aria-labelledby="new-title">
      <SectionHeading
        id="new-title"
        title={t('new')}
        subtitle={t('newSubtitle')}
        action={<ViewAll href="/books?sort=newest" />}
      />
      <Carousel prevLabel={t('prev')} nextLabel={t('next')}>
        {books.map((book) => (
          <li key={book.id} className={`${SLIDE} lg:w-[18.6%]`}>
            <BookCard book={book} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

/** Аудиокниги (ТЗ 2.4, п. 6). */
export async function AudiobooksSection({ audiobooks }: { audiobooks: AudiobookListItem[] }) {
  const t = await getTranslations('sections');
  if (audiobooks.length === 0) return null;
  return (
    <section className="container-page mt-20" aria-labelledby="audiobooks-title">
      <SectionHeading
        id="audiobooks-title"
        title={t('audiobooks')}
        subtitle={t('audiobooksSubtitle')}
        action={<ViewAll href="/audiobooks" />}
      />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
        {audiobooks.map((audiobook) => (
          <li key={audiobook.id}>
            <AudiobookCard audiobook={audiobook} />
          </li>
        ))}
      </ul>
    </section>
  );
}
