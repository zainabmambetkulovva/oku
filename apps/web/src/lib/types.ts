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

export type OrderStatus =
  'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface OrderDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: {
    id: string;
    productType: 'BOOK' | 'AUDIOBOOK';
    bookId: string | null;
    audiobookId: string | null;
    title: string;
    author: string;
    coverUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  deliveryPrice: number;
  discount: number;
  total: number;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  deliveryMethod: DeliveryOption['method'] | null;
  deliveryAddress: string | null;
  paymentMethod: 'ONLINE' | 'CASH';
  comment: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  statusHistory: {
    oldStatus: OrderStatus | null;
    newStatus: OrderStatus;
    comment: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    provider: string;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
    amount: number;
    paymentUrl: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
}

export interface PaymentSession {
  id: string;
  provider: string;
  paymentUrl: string;
  amount: number;
  expiresAt: string | null;
}

export interface SavedAddress {
  id: string;
  title: string;
  recipientName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  building: string;
  apartment: string | null;
  postalCode: string | null;
  isDefault: boolean;
}
