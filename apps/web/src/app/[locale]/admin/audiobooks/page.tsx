'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PageHeader, StatusBadge, inputClass } from '@/components/admin/ui';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminApi, type ProductStatus } from '@/lib/admin-api';
import { formatClock, formatPrice } from '@/lib/format';

/** Список аудиокниг: поиск, фильтр по статусу, страницы. */
export default function AudiobooksPage() {
  const t = useTranslations('admin.audiobooksAdmin');
  const tc = useTranslations('admin.common');
  const tstatus = useTranslations('admin.status');
  const tb = useTranslations('admin.books');
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

  const audiobooks = useQuery({
    queryKey: ['admin', 'audiobooks', query, status, page],
    queryFn: () => adminApi.audiobooks({ search: query, status, page }),
  });

  return (
    <>
      <PageHeader
        title={t('title')}
        action={
          <Link href="/admin/audiobooks/new" className={buttonClasses('primary')}>
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
          aria-label={tb('status')}
          className={`${inputClass} mt-0 sm:w-56`}
        >
          <option value="">{tb('allStatuses')}</option>
          {(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((value) => (
            <option key={value} value={value}>
              {tstatus(value)}
            </option>
          ))}
        </select>
      </div>

      {audiobooks.isError ? (
        <p className="card p-8 text-center text-sm text-muted">{tc('error')}</p>
      ) : !audiobooks.data ? (
        <p className="text-sm text-muted" role="status">
          {tc('loading')}
        </p>
      ) : audiobooks.data.data.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          {query || status ? t('notFound') : t('empty')}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {audiobooks.data.data.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/admin/audiobooks/${book.id}`}
                  className="card lift flex items-center gap-4 p-3 sm:p-4"
                >
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-[0.6rem] text-muted">{tb('cover')}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{book.title}</span>
                    <span className="block truncate text-xs text-muted">{book.author}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {formatPrice(book.price)} ·{' '}
                      {t('duration', { time: formatClock(book.durationSeconds) })}
                    </span>
                  </span>
                  <span className="hidden w-24 text-right text-sm font-semibold text-cocoa sm:block">
                    {formatPrice(book.price)}
                  </span>
                  <span className="hidden w-20 text-right text-sm sm:block">
                    {book.chapters.length}
                  </span>
                  <StatusBadge status={book.status} />
                </Link>
              </li>
            ))}
          </ul>
          {audiobooks.data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="font-semibold disabled:opacity-40"
              >
                ← {tc('prev')}
              </button>
              <span>{tc('page', { page, total: audiobooks.data.meta.totalPages })}</span>
              <button
                type="button"
                disabled={page >= audiobooks.data.meta.totalPages}
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
