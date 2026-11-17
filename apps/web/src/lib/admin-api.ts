'use client';

import { apiBaseUrl } from './api';
import { authFetch, useAuth } from './auth';
import type { Paginated } from './types';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ContentLanguage = 'ky' | 'ru' | 'en';

export interface AdminBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  coverKey: string | null;
  coverUrl: string | null;
  publisher: string | null;
  publicationYear: number | null;
  pages: number | null;
  language: ContentLanguage | null;
  isbn: string | null;
  price: number;
  stockQuantity: number;
  salesCount: number;
  status: ProductStatus;
  categories: { id: string; name: string; slug: string }[];
  images: { id: string; storageKey: string; url: string | null; altText: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface BookInput {
  title: string;
  author: string;
  description?: string | null;
  coverKey?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  pages?: number | null;
  language?: ContentLanguage | null;
  isbn?: string | null;
  price: number;
  stockQuantity?: number;
  categoryIds?: string[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  childrenCount: number;
  booksCount: number;
  audiobooksCount: number;
}

export interface CategoryInput {
  name: string;
  description?: string | null;
  imageKey?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Dashboard {
  users: { total: number; newLast30Days: number };
  books: { total: number; active: number };
  audiobooks: { total: number; active: number };
  orders: { total: number; byStatus: Record<string, number> };
  sales: { currency: string; totalRevenue: number; revenueLast30Days: number };
  alerts: {
    paymentsToReview: number;
    lowStockThreshold: number;
    lowStockBooks: { id: string; slug: string; title: string; stockQuantity: number }[];
  };
  recentOrders: {
    orderNumber: string;
    status: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    recipientName: string;
    user: { email: string } | null;
  }[];
}

export interface SalesSeries {
  totalRevenue: number;
  totalOrders: number;
  series: { period: string; ordersCount: number; revenue: number }[];
}

export type UploadKind =
  'book-cover' | 'book-image' | 'category-image' | 'audiobook-cover' | 'audio-chapter';

const json = (body: unknown) => ({ body: JSON.stringify(body) });

export interface AdminQuote {
  id: string;
  text: string;
  author: string;
  source: string | null;
  bookId: string | null;
  book: { slug: string; title: string } | null;
  locale: 'ru' | 'ky';
  isActive: boolean;
  createdAt: string;
}

export interface QuoteInput {
  text: string;
  author: string;
  source?: string;
  locale: 'ru' | 'ky';
  isActive: boolean;
}

// ─── Заказы, платежи, пользователи, отзывы, журнал ────────────────────────────

export type OrderStatusValue =
  'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  items: {
    id: string;
    productType: 'BOOK' | 'AUDIOBOOK';
    title: string;
    author: string;
    coverUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
  recipientName: string;
  recipientPhone: string;
  deliveryMethod: 'PICKUP' | 'COURIER' | 'POST' | null;
  deliveryAddress: string | null;
  paymentMethod: 'ONLINE' | 'CASH';
  comment: string | null;
  expiresAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  statusHistory: {
    oldStatus: OrderStatusValue | null;
    newStatus: OrderStatusValue;
    comment: string | null;
    changedBy: { id: string; email: string } | null;
    createdAt: string;
  }[];
  payments: AdminPayment[];
}

export interface AdminPayment {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: string;
  amount: number;
  paidAt: string | null;
  requiresReview: boolean;
  reviewReason?: string | null;
  createdAt: string;
  order?: { orderNumber: string; status: OrderStatusValue };
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  emailVerified: boolean;
  locale: string;
  googleLinked: boolean;
  createdAt: string;
  isLocked: boolean;
  ordersCount: number;
  isRoleManager: boolean;
  stats?: {
    ordersCount: number;
    paidOrdersCount: number;
    totalSpent: number;
    audiobooksCount: number;
    reviewsCount: number;
  };
}

export interface AdminReview {
  id: string;
  rating: number;
  text: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  book: { slug: string; title: string } | null;
  audiobook: { slug: string; title: string } | null;
  reportsCount: number;
  reports: { reason: string | null; createdAt: string }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string } | null;
}

export interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

// ─── Аудиокниги ──────────────────────────────────────────────────────────────

export interface AdminChapter {
  id: string;
  title: string;
  chapterNumber: number;
  durationSeconds: number;
  storageKey: string;
  isFreePreview: boolean;
}

export interface AdminAudiobook {
  id: string;
  title: string;
  slug: string;
  author: string;
  narrator: string | null;
  description: string | null;
  coverKey: string | null;
  coverUrl: string | null;
  language: ContentLanguage | null;
  durationSeconds: number;
  price: number;
  salesCount: number;
  status: ProductStatus;
  categories: { id: string; name: string; slug: string }[];
  chapters: AdminChapter[];
}

export interface AudiobookInput {
  title: string;
  author: string;
  narrator: string | null;
  description: string | null;
  coverKey?: string | null;
  language: ContentLanguage | null;
  price: number;
  categoryIds: string[];
}

export interface AccessGrant {
  id: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  orderItemId: string | null;
  isActive: boolean;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
}

/** Строка запроса без пустых значений. */
export function queryString(params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export const adminApi = {
  dashboard: () => authFetch<Dashboard>('/admin/dashboard'),
  sales: () => authFetch<SalesSeries>('/admin/analytics/sales?groupBy=day'),

  books: (params: { search?: string; status?: ProductStatus | ''; page?: number }) => {
    const query = new URLSearchParams({ limit: '20', page: String(params.page ?? 1) });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    return authFetch<Paginated<AdminBook>>(`/admin/books?${query}`);
  },
  book: (id: string) => authFetch<AdminBook>(`/admin/books/${id}`),
  createBook: (input: BookInput) =>
    authFetch<AdminBook>('/admin/books', { method: 'POST', ...json(input) }),
  updateBook: (id: string, input: Partial<BookInput>) =>
    authFetch<AdminBook>(`/admin/books/${id}`, { method: 'PATCH', ...json(input) }),
  setBookStatus: (id: string, status: ProductStatus) =>
    authFetch<AdminBook>(`/admin/books/${id}/status`, { method: 'PATCH', ...json({ status }) }),
  deleteBook: (id: string) => authFetch<void>(`/admin/books/${id}`, { method: 'DELETE' }),
  addBookImage: (id: string, storageKey: string) =>
    authFetch<unknown>(`/admin/books/${id}/images`, { method: 'POST', ...json({ storageKey }) }),
  removeBookImage: (id: string, imageId: string) =>
    authFetch<void>(`/admin/books/${id}/images/${imageId}`, { method: 'DELETE' }),

  categories: () => authFetch<AdminCategory[]>('/admin/categories'),
  createCategory: (input: CategoryInput) =>
    authFetch<AdminCategory>('/admin/categories', { method: 'POST', ...json(input) }),
  updateCategory: (id: string, input: Partial<CategoryInput>) =>
    authFetch<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', ...json(input) }),
  deleteCategory: (id: string) => authFetch<void>(`/admin/categories/${id}`, { method: 'DELETE' }),

  quotes: (page = 1) => authFetch<Paginated<AdminQuote>>(`/admin/quotes?limit=50&page=${page}`),
  createQuote: (input: QuoteInput) =>
    authFetch<AdminQuote>('/admin/quotes', { method: 'POST', ...json(input) }),
  updateQuote: (id: string, input: Partial<QuoteInput>) =>
    authFetch<AdminQuote>(`/admin/quotes/${id}`, { method: 'PATCH', ...json(input) }),
  deleteQuote: (id: string) => authFetch<void>(`/admin/quotes/${id}`, { method: 'DELETE' }),

  orders: (params: Record<string, string | number | boolean | undefined>) =>
    authFetch<Paginated<AdminOrder>>(`/admin/orders?${queryString({ limit: 20, ...params })}`),
  order: (orderNumber: string) =>
    authFetch<AdminOrder>(`/admin/orders/${encodeURIComponent(orderNumber)}`),
  setOrderStatus: (orderNumber: string, status: string, comment?: string) =>
    authFetch<AdminOrder>(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: 'PATCH',
      ...json({ status, comment: comment || undefined }),
    }),
  refundOrder: (orderNumber: string, comment?: string) =>
    authFetch<AdminOrder>(`/admin/orders/${encodeURIComponent(orderNumber)}/refund`, {
      method: 'POST',
      ...json({ comment: comment || undefined }),
    }),

  payments: (params: Record<string, string | number | boolean | undefined>) =>
    authFetch<Paginated<AdminPayment>>(`/admin/payments?${queryString({ limit: 20, ...params })}`),
  resolvePayment: (id: string, refunded: boolean, note: string) =>
    authFetch<AdminPayment>(`/admin/payments/${id}/resolve`, {
      method: 'POST',
      ...json({ refunded, note }),
    }),

  users: (params: Record<string, string | number | undefined>) =>
    authFetch<Paginated<AdminUser>>(`/admin/users?${queryString({ limit: 20, ...params })}`),
  user: (id: string) => authFetch<AdminUser>(`/admin/users/${id}`),
  userOrders: (id: string) =>
    authFetch<Paginated<AdminOrder>>(`/admin/users/${id}/orders?limit=20`),
  setUserStatus: (id: string, status: AdminUser['status']) =>
    authFetch<AdminUser>(`/admin/users/${id}/status`, { method: 'PATCH', ...json({ status }) }),
  unlockUser: (id: string) => authFetch<AdminUser>(`/admin/users/${id}/unlock`, { method: 'POST' }),
  setUserRole: (id: string, role: AdminUser['role']) =>
    authFetch<AdminUser>(`/admin/users/${id}/role`, { method: 'PATCH', ...json({ role }) }),

  reviews: (params: Record<string, string | number | boolean | undefined>) =>
    authFetch<Paginated<AdminReview>>(`/admin/reviews?${queryString({ limit: 20, ...params })}`),
  moderateReview: (id: string, status: 'APPROVED' | 'REJECTED') =>
    authFetch<unknown>(`/admin/reviews/${id}`, { method: 'PATCH', ...json({ status }) }),
  deleteReview: (id: string) => authFetch<void>(`/admin/reviews/${id}`, { method: 'DELETE' }),

  auditLogs: (params: Record<string, string | number | undefined>) =>
    authFetch<Paginated<AuditEntry>>(`/admin/audit-logs?${queryString({ limit: 30, ...params })}`),
  subscribers: (params: Record<string, string | number | undefined>) =>
    authFetch<Paginated<Subscriber>>(
      `/admin/newsletter/subscribers?${queryString({ limit: 30, ...params })}`,
    ),

  audiobooks: (params: { search?: string; status?: ProductStatus | ''; page?: number }) =>
    authFetch<Paginated<AdminAudiobook>>(
      `/admin/audiobooks?${queryString({ limit: 20, page: params.page ?? 1, search: params.search, status: params.status })}`,
    ),
  audiobook: (id: string) => authFetch<AdminAudiobook>(`/admin/audiobooks/${id}`),
  createAudiobook: (input: AudiobookInput) =>
    authFetch<AdminAudiobook>('/admin/audiobooks', { method: 'POST', ...json(input) }),
  updateAudiobook: (id: string, input: Partial<AudiobookInput>) =>
    authFetch<AdminAudiobook>(`/admin/audiobooks/${id}`, { method: 'PATCH', ...json(input) }),
  setAudiobookStatus: (id: string, status: ProductStatus) =>
    authFetch<AdminAudiobook>(`/admin/audiobooks/${id}/status`, {
      method: 'PATCH',
      ...json({ status }),
    }),
  deleteAudiobook: (id: string) => authFetch<void>(`/admin/audiobooks/${id}`, { method: 'DELETE' }),
  addChapter: (
    id: string,
    input: { title: string; durationSeconds: number; storageKey: string; isFreePreview: boolean },
  ) => authFetch<unknown>(`/admin/audiobooks/${id}/chapters`, { method: 'POST', ...json(input) }),
  updateChapter: (
    id: string,
    chapterId: string,
    input: Partial<{ title: string; isFreePreview: boolean }>,
  ) =>
    authFetch<unknown>(`/admin/audiobooks/${id}/chapters/${chapterId}`, {
      method: 'PATCH',
      ...json(input),
    }),
  reorderChapters: (id: string, chapterIds: string[]) =>
    authFetch<unknown>(`/admin/audiobooks/${id}/chapters/order`, {
      method: 'PUT',
      ...json({ chapterIds }),
    }),
  deleteChapter: (id: string, chapterId: string) =>
    authFetch<void>(`/admin/audiobooks/${id}/chapters/${chapterId}`, { method: 'DELETE' }),
  accessGrants: (id: string) => authFetch<AccessGrant[]>(`/admin/audiobooks/${id}/access`),
  grantAccess: (id: string, email: string, expiresAt?: string) =>
    authFetch<unknown>(`/admin/audiobooks/${id}/access`, {
      method: 'POST',
      ...json({ email, expiresAt: expiresAt || undefined }),
    }),
  revokeAccess: (id: string, userId: string) =>
    authFetch<void>(`/admin/audiobooks/${id}/access/${userId}`, { method: 'DELETE' }),
};

export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];
export const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

/** CSV активных подписчиков — файлом (ответ API без обёртки). */
export async function downloadSubscribersCsv(): Promise<void> {
  const token = useAuth.getState().accessToken;
  const response = await fetch(`${apiBaseUrl()}/admin/newsletter/subscribers/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: 'oku24-subscribers.csv',
  });
  link.click();
  URL.revokeObjectURL(url);
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}

/**
 * Загрузка файла напрямую в хранилище: сервер выдаёт подписанную форму,
 * браузер отправляет файл (с прогрессом), возвращается ключ для сохранения в товаре.
 */
export async function uploadFile(
  kind: UploadKind,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const upload = await authFetch<PresignedUpload>('/admin/uploads', {
    method: 'POST',
    ...json({ kind, contentType: file.type, size: file.size }),
  });
  const form = new FormData();
  for (const [name, value] of Object.entries(upload.fields)) form.append(name, value);
  form.append('file', file);

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', upload.url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Upload failed with status ${request.status}`));
    request.onerror = () => reject(new Error('Upload failed'));
    request.send(form);
  });
  onProgress?.(100);
  return upload.key;
}
