'use client';

import { useTranslations } from 'next-intl';
import { AudiobookForm } from '@/components/admin/audiobook-form';
import { PageHeader } from '@/components/admin/ui';

export default function NewAudiobookPage() {
  const t = useTranslations('admin.audiobooksAdmin');
  return (
    <>
      <PageHeader title={t('newTitle')} />
      <AudiobookForm />
    </>
  );
}
