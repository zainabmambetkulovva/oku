'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookForm } from '@/components/admin/book-form';
import { PageHeader } from '@/components/admin/ui';
import { adminApi } from '@/lib/admin-api';

export default function EditBookPage() {
  const t = useTranslations('admin.books');
  const tc = useTranslations('admin.common');
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created') === '1';
  const book = useQuery({ queryKey: ['admin', 'book', id], queryFn: () => adminApi.book(id) });

  return (
    <>
      <PageHeader title={t('editTitle')} />
      {book.isError ? (
        <p className="card p-8 text-center text-sm text-muted">{tc('error')}</p>
      ) : !book.data ? (
        <p className="text-sm text-muted" role="status">
          {tc('loading')}
        </p>
      ) : (
        <BookForm key={book.data.id} book={book.data} justCreated={created} />
      )}
    </>
  );
}
