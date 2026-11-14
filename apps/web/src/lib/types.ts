/** Типы ответов API (apps/api), которые использует frontend. Цены — в тыйынах. */

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface Rating {
  average: number | null;
  count: number;
}

export interface BookListItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  language: string | null;
  price: number;
  currency: string;
  inStock: boolean;
  stockQuantity: number;
  categories: CategorySummary[];
  rating: Rating;
  createdAt: string;
}

export interface AudiobookListItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  narrator: string | null;
  coverUrl: string | null;
  language: string | null;
  durationSeconds: number;
  chaptersCount: number;
  hasFreePreview: boolean;
  price: number;
  currency: string;
  categories: CategorySummary[];
  rating: Rating;
  createdAt: string;
}

export interface AudioChapterSummary {
  id: string;
  chapterNumber: number;
  title: string;
  description: string | null;
  durationSeconds: number;
  isFreePreview: boolean;
}

export interface AudiobookDetails extends AudiobookListItem {
  description: string | null;
  chapters: AudioChapterSummary[];
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  booksCount: number;
  audiobooksCount: number;
  children: CategoryNode[];
}

export interface DeliveryOption {
  method: 'PICKUP' | 'COURIER' | 'POST';
  price: number;
  currency: string;
  requiresAddress: boolean;
}

export interface StreamLink {
  url: string;
  expiresAt: string;
  chapter: { id: string; chapterNumber: number; title: string; durationSeconds: number };
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

/** Отзыв для главной: GET /reviews/latest */
export interface LatestReview {
  id: string;
  rating: number;
  text: string | null;
  author: { name: string };
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: { type: 'BOOK' | 'AUDIOBOOK'; slug: string; title: string } | null;
}

export interface BookDetails extends BookListItem {
  description: string | null;
  publisher: string | null;
  publicationYear: number | null;
  pages: number | null;
  isbn: string | null;
  images: { id: string; url: string | null; altText: string | null }[];
}

export interface CategoryDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ReviewItem {
  id: string;
  rating: number;
  text: string | null;
  author: { name: string };
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}
