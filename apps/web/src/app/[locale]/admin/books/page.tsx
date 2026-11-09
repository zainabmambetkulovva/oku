'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PageHeader, StatusBadge, inputClass } from '@/components/admin/ui';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminApi, type ProductStatus } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format';

/** Список книг: поиск, фильтр по статусу, страницы. */
export default function BooksPage() {
  const t = useTranslations('admin.books');
  const tc = useTranslations('admin.common');
  const tstatus = useTranslations('admin.status');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);

  // Поиск — с небольшой задержкой, чтобы не запрашивать на каждую букву
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const books = useQuery({
    queryKey: ['admin', 'books', query, status, page],
    queryFn: () => adminApi.books({ search: query, status, page }),
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        action={
          <Link href="/admin/books/new" className={buttonClasses('primary')}>
            + {t('add')}
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('search')}
          aria-label={t('search')}
          className={`${inputClass} mt-0 sm:max-w-sm`}
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | '');
            setPage(1);
          }}
          aria-label={t('status')}
          className={`${inputClass} mt-0 sm:w-56`}
        >
          <option value="">{t('allStatuses')}</option>
          {(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((value) => (
            <option key={value} value={value}>
              {tstatus(value)}
            </option>
          ))}
        </select>
      </div>

      {books.isError ? (
        <p className="card p-8 text-center text-sm text-muted">{tc('error')}</p>
      ) : !books.data ? (
        <p className="text-sm text-muted" role="status">
          {tc('loading')}
        </p>
      ) : books.data.data.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          {query || status ? t('notFound') : t('empty')}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {books.data.data.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/admin/books/${book.id}`}
                  className="card lift flex items-center gap-4 p-3 sm:p-4"
                >
                  <span className="grid h-20 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-[0.6rem] text-muted">{t('cover')}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{book.title}</span>
                    <span className="block truncate text-xs text-muted">{book.author}</span>
                    <span className="mt-1 block text-xs text-muted sm:hidden">
                      {formatPrice(book.price)} · {t('stock')}: {book.stockQuantity}
                    </span>
                  </span>
                  <span className="hidden w-24 text-right text-sm font-semibold text-cocoa sm:block">
                    {formatPrice(book.price)}
                  </span>
                  <span className="hidden w-20 text-right text-sm sm:block">
                    {book.stockQuantity}
                  </span>
                  <StatusBadge status={book.status} />
                </Link>
              </li>
            ))}
          </ul>
          {books.data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="font-semibold disabled:opacity-40"
              >
                ← {tc('prev')}
              </button>
              <span>{tc('page', { page, total: books.data.meta.totalPages })}</span>
              <button
                type="button"
                disabled={page >= books.data.meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="font-semibold disabled:opacity-40"
              >
                {tc('next')} →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
