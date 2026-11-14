import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogView } from '@/components/catalog/catalog-view';
import { AudiobookCard } from '@/components/catalog/product-card';
import { apiFetchPage } from '@/lib/api';
import { apiQuery, type CatalogParams, normalizeParams } from '@/lib/catalog-params';
import type { AudiobookListItem, Paginated } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogParams>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return { title: t('audiobooksTitle'), description: t('audiobooksLead') };
}

/** Каталог аудиокниг — пятая официальная категория. */
export default async function AudiobooksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = normalizeParams(await searchParams);
  const t = await getTranslations('catalog');
  const audiobooks = await apiFetchPage<AudiobookListItem>(
    `/audiobooks?${apiQuery(query, 'audiobooks')}`,
  ).catch(() => null as Paginated<AudiobookListItem> | null);

  return (
    <CatalogView
      base="/audiobooks"
      title={t('audiobooksTitle')}
      lead={t('audiobooksLead')}
      params={query}
      categories={[]}
      total={audiobooks ? audiobooks.meta.total : null}
      totalPages={audiobooks?.meta.totalPages ?? 0}
    >
      {audiobooks?.data.map((audiobook) => (
        <li key={audiobook.id}>
          <AudiobookCard audiobook={audiobook} />
        </li>
      ))}
    </CatalogView>
  );
}
