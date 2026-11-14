import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookCard } from '@/components/catalog/product-card';
import { Book3D } from '@/components/product/book-3d';
import {
  Breadcrumbs,
  CategoryChips,
  RatingLine,
  SpecsTable,
} from '@/components/product/product-parts';
import { PurchaseBox } from '@/components/product/purchase-box';
import { ReviewsBlock } from '@/components/product/reviews-block';
import { Carousel } from '@/components/ui/carousel';
import { apiFetch, ApiRequestError, safely } from '@/lib/api';
import type { BookDetails, BookListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; slug: string }> };

async function loadBook(slug: string): Promise<BookDetails> {
  try {
    return await apiFetch<BookDetails>(`/books/${encodeURIComponent(slug)}`);
  } catch (caught) {
    if (caught instanceof ApiRequestError && caught.status === 404) notFound();
    throw caught;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const book = await safely(
    () => apiFetch<BookDetails>(`/books/${encodeURIComponent(slug)}`),
    null,
    'book meta',
  );
  if (!book) return {};
  const description = book.description?.slice(0, 160) ?? `${book.title} — ${book.author}`;
  return {
    title: `${book.title} — ${book.author}`,
    description,
    openGraph: { title: book.title, description, images: book.coverUrl ? [book.coverUrl] : [] },
  };
}

/** Страница печатной книги: 3D-обложка, покупка, описание, характеристики, фото, отзывы, похожие. */
export default async function BookPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const book = await loadBook(slug);
  const t = await getTranslations('productPage');
  const tl = await getTranslations('catalog.languages');
  const ts = await getTranslations('sections');
  const similar = await safely(
    () => apiFetch<BookListItem[]>(`/books/${book.slug}/similar`),
    [],
    'similar books',
  );
  const gallery = book.images.filter((image) => image.url);

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs href="/books" title={book.title} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <Book3D
          slug={book.slug}
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          pages={book.pages}
        />

        <div className="space-y-5">
          <div>
            <h1 className="text-[2rem] leading-tight font-medium text-cocoa sm:text-[2.5rem]">
              {book.title}
            </h1>
            <p className="mt-2 text-lg text-ink/80">{book.author}</p>
            <div className="mt-3">
              <RatingLine rating={book.rating} />
            </div>
          </div>
          <PurchaseBox
            item={{
              type: 'BOOK',
              id: book.id,
              slug: book.slug,
              title: book.title,
              author: book.author,
              coverUrl: book.coverUrl,
              price: book.price,
              stock: book.stockQuantity,
            }}
            stockQuantity={book.stockQuantity}
          />
          <CategoryChips categories={book.categories} />
        </div>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card p-6" aria-labelledby="description-heading">
          <h2 id="description-heading" className="font-sans text-base font-semibold text-ink">
            {t('description')}
          </h2>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed whitespace-pre-line text-ink/85"
            data-testid="description"
          >
            {book.description || t('noDescription')}
          </p>
        </section>
        <SpecsTable
          title={t('specs')}
          rows={[
            [t('author'), book.author],
            [t('publisher'), book.publisher],
            [t('year'), book.publicationYear],
            [t('pages'), book.pages],
            [
              t('language'),
              book.language && tl.has(book.language) ? tl(book.language) : book.language,
            ],
            [t('isbn'), book.isbn],
          ]}
        />
      </div>

      {gallery.length > 0 && (
        <section className="mt-12" aria-labelledby="gallery-heading">
          <h2 id="gallery-heading" className="text-[1.6rem] font-medium text-cocoa">
            {t('gallery')}
          </h2>
          <ul
            className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            data-testid="gallery"
          >
            {gallery.map((image) => (
              <li key={image.id}>
                <a
                  href={image.url!}
                  target="_blank"
                  rel="noopener"
                  className="block overflow-hidden rounded-2xl shadow-[var(--shadow-card)]"
                >
                  <img
                    src={image.url!}
                    alt={image.altText ?? book.title}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover transition duration-500 hover:scale-105"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14">
        <ReviewsBlock kind="books" slug={book.slug} />
      </div>

      {similar.length > 0 && (
        <section className="mt-14" aria-labelledby="similar-heading" data-testid="similar">
          <h2
            id="similar-heading"
            className="mb-6 text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('similarBooks')}
          </h2>
          <Carousel prevLabel={ts('prev')} nextLabel={ts('next')}>
            {similar.map((item) => (
              <li
                key={item.id}
                className="w-[calc((100%_-_1rem)/2)] shrink-0 snap-start sm:w-[calc((100%_-_2rem)/3)] lg:w-[calc((100%_-_3rem)/4)]"
              >
                <BookCard book={item} />
              </li>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
