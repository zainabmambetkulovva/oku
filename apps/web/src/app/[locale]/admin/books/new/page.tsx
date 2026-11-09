'use client';

import { useTranslations } from 'next-intl';
import { BookForm } from '@/components/admin/book-form';
import { PageHeader } from '@/components/admin/ui';

export default function NewBookPage() {
  const t = useTranslations('admin.books');
  return (
    <>
      <PageHeader title={t('newTitle')} />
      <BookForm />
    </>
  );
}
