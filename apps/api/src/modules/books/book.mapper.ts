import { Prisma } from '@prisma/client';
import { categorySummarySelect, toCategorySummaries } from '../catalog/catalog.mapper';
import { Rating } from '../reviews/ratings.service';
import { StorageService } from '../storage/storage.service';

export const bookInclude = {
  bookCategories: {
    include: { category: { select: { ...categorySummarySelect, isActive: true } } },
  },
  bookImages: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.BookInclude;

export type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

/** Карточка книги в списке каталога. */
export function toBookListItem(book: BookWithRelations, storage: StorageService, rating: Rating) {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    author: book.author,
    coverUrl: storage.publicUrl(book.coverKey),
    language: book.language,
    price: book.price,
    currency: book.currency,
    inStock: book.stockQuantity > 0,
    stockQuantity: book.stockQuantity,
    categories: toCategorySummaries(book.bookCategories),
    rating,
    createdAt: book.createdAt,
  };
}

/** Страница книги. */
export function toBookDetails(book: BookWithRelations, storage: StorageService, rating: Rating) {
  return {
    ...toBookListItem(book, storage, rating),
    description: book.description,
    publisher: book.publisher,
    publicationYear: book.publicationYear,
    pages: book.pages,
    isbn: book.isbn,
    images: book.bookImages.map((image) => ({
      id: image.id,
      url: storage.publicUrl(image.storageKey),
      altText: image.altText,
    })),
  };
}

/** Книга в админке: все поля, включая статус, ключи файлов и продажи. */
export function toAdminBook(book: BookWithRelations, storage: StorageService) {
  const { bookCategories, bookImages, ...fields } = book;
  return {
    ...fields,
    coverUrl: storage.publicUrl(book.coverKey),
    categories: bookCategories.map(({ category }) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    images: bookImages.map((image) => ({ ...image, url: storage.publicUrl(image.storageKey) })),
  };
}
