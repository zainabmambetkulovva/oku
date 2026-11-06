import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AudiobookListItem, BookListItem } from '@/lib/types';
import { AudiobookCard, BookCard } from '../catalog/product-card';
import { ArrowRight } from '../ui/button';
import { SectionTitle } from '../ui/section-title';

interface ProductsSectionProps {
  id: string;
  title: string;
  href: string;
  layout?: 'grid' | 'row';
}

async function ViewAll({ href }: { href: string }) {
  const t = await getTranslations('sections');
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-gold-dark"
    >
      {t('viewAll')} <ArrowRight />
    </Link>
  );
}

export async function BooksSection({
  books,
  ...props
}: ProductsSectionProps & { books: BookListItem[] }) {
  const t = await getTranslations('sections');
  return (
    <section className="container-page mt-16" aria-labelledby={props.id}>
      <SectionTitle id={props.id} action={<ViewAll href={props.href} />}>
        {props.title}
      </SectionTitle>
      {books.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t('empty')}</p>
      ) : props.layout === 'row' ? (
        <ul className="scroll-row">
          {books.map((book) => (
            <li
              key={book.id}
              className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[18%]"
            >
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {books.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function AudiobooksSection({
  audiobooks,
  ...props
}: ProductsSectionProps & { audiobooks: AudiobookListItem[] }) {
  if (audiobooks.length === 0) return null;
  return (
    <section className="container-page mt-16" aria-labelledby={props.id}>
      <SectionTitle id={props.id} action={<ViewAll href={props.href} />}>
        {props.title}
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {audiobooks.map((audiobook) => (
          <li key={audiobook.id}>
            <AudiobookCard audiobook={audiobook} />
          </li>
        ))}
      </ul>
    </section>
  );
}
