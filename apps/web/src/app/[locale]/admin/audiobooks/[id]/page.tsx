'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AudiobookForm } from '@/components/admin/audiobook-form';
import { ListState, PageHeader } from '@/components/admin/ui';
import { adminApi } from '@/lib/admin-api';

export default function EditAudiobookPage() {
  const t = useTranslations('admin.audiobooksAdmin');
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created') === '1';
  const audiobook = useQuery({
    queryKey: ['admin', 'audiobook', id],
    queryFn: () => adminApi.audiobook(id),
  });
  return (
    <>
      <PageHeader title={audiobook.data?.title ?? t('editTitle')} />
      <ListState error={audiobook.isError} loading={audiobook.isLoading} />
      {audiobook.data && (
        <AudiobookForm key={audiobook.data.id} audiobook={audiobook.data} justCreated={created} />
      )}
    </>
  );
}
