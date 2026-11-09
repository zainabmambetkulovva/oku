'use client';

import { authFetch } from './auth';
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

export type UploadKind = 'book-cover' | 'book-image' | 'category-image';

const json = (body: unknown) => ({ body: JSON.stringify(body) });

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
};

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
