import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookCover } from '@/components/catalog/book-cover';
import { AudiobookCard } from '@/components/catalog/product-card';
import { AudioPlayer } from '@/components/home/audio-player';
import {
  Breadcrumbs,
  CategoryChips,
  RatingLine,
  SpecsTable,
} from '@/components/product/product-parts';
import { PurchaseBox } from '@/components/product/purchase-box';
import { ReviewsBlock } from '@/components/product/reviews-block';
import { apiFetch, ApiRequestError, safely } from '@/lib/api';
import { splitDuration } from '@/lib/format';
import type { AudiobookDetails, AudiobookListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; slug: string }> };

async function loadAudiobook(slug: string): Promise<AudiobookDetails> {
  try {
    return await apiFetch<AudiobookDetails>(`/audiobooks/${encodeURIComponent(slug)}`);
  } catch (caught) {
    if (caught instanceof ApiRequestError && caught.status === 404) notFound();
    throw caught;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = await safely(
    () => apiFetch<AudiobookDetails>(`/audiobooks/${encodeURIComponent(slug)}`),
    null,
    'audiobook meta',
  );
  if (!item) return {};
  const description = item.description?.slice(0, 160) ?? `${item.title} — ${item.author}`;
  return {
    title: `${item.title} — ${item.author}`,
    description,
    openGraph: { title: item.title, description, images: item.coverUrl ? [item.coverUrl] : [] },
  };
}

/** Страница аудиокниги: обложка, покупка (доступ навсегда), бесплатный фрагмент, главы, отзывы, похожие. */
export default async function AudiobookPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const audiobook = await loadAudiobook(slug);
  const t = await getTranslations('productPage');
  const tu = await getTranslations('units');
  const tl = await getTranslations('catalog.languages');
  const similar = await safely(
    () => apiFetch<AudiobookListItem[]>(`/audiobooks/${audiobook.slug}/similar`),
    [],
    'similar audiobooks',
  );
  const { hours, minutes } = splitDuration(audiobook.durationSeconds);
  const duration = [
    hours ? tu('hours', { count: hours }) : null,
    minutes ? tu('minutes', { count: minutes }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs href="/audiobooks" title={audiobook.title} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div className="relative mx-auto w-full max-w-sm">
          <div
            className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle,rgb(233_183_92/0.35),transparent_70%)] blur-xl"
            aria-hidden="true"
          />
          <div className="relative animate-float [animation-duration:8s]">
            <BookCover
              slug={audiobook.slug}
              title={audiobook.title}
              author={audiobook.author}
              coverUrl={audiobook.coverUrl}
              square
              className="rounded-[1.6rem]"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-[2rem] leading-tight font-medium text-cocoa sm:text-[2.5rem]">
              {audiobook.title}
            </h1>
            <p className="mt-2 text-lg text-ink/80">{audiobook.author}</p>
            {audiobook.narrator && (
              <p className="mt-1 text-sm text-ink/70">
                {t('narrator')}: {audiobook.narrator}
              </p>
            )}
            <p className="mt-1 text-sm text-ink/70" data-testid="audio-meta">
              {duration} · {t('chapters', { count: audiobook.chaptersCount })}
            </p>
            <div className="mt-3">
              <RatingLine rating={audiobook.rating} />
            </div>
          </div>
          <PurchaseBox
            item={{
              type: 'AUDIOBOOK',
              id: audiobook.id,
              slug: audiobook.slug,
              title: audiobook.title,
              author: audiobook.author,
              coverUrl: audiobook.coverUrl,
              price: audiobook.price,
            }}
          />
          <CategoryChips categories={audiobook.categories} />
        </div>
      </div>

      <section className="mt-14" aria-labelledby="preview-heading" data-testid="preview">
        <h2
          id="preview-heading"
          className="text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
        >
          {t('preview')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/75">
          {audiobook.hasFreePreview ? t('previewText') : t('noPreview')}
        </p>
        <div className="mt-5">
          <AudioPlayer audiobook={audiobook} />
        </div>
      </section>

      <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card p-6" aria-labelledby="description-heading">
          <h2 id="description-heading" className="font-sans text-base font-semibold text-ink">
            {t('description')}
          </h2>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed whitespace-pre-line text-ink/85"
            data-testid="description"
          >
            {audiobook.description || t('noDescription')}
          </p>
        </section>
        <SpecsTable
          title={t('specs')}
          rows={[
            [t('author'), audiobook.author],
            [t('narrator'), audiobook.narrator],
            [t('duration'), duration],
            [
              t('language'),
              audiobook.language && tl.has(audiobook.language)
                ? tl(audiobook.language)
                : audiobook.language,
            ],
          ]}
        />
      </div>

      <div className="mt-14">
        <ReviewsBlock kind="audiobooks" slug={audiobook.slug} />
      </div>

      {similar.length > 0 && (
        <section className="mt-14" aria-labelledby="similar-heading" data-testid="similar">
          <h2
            id="similar-heading"
            className="mb-6 text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
          >
            {t('similarAudiobooks')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {similar.slice(0, 4).map((item) => (
              <li key={item.id}>
                <AudiobookCard audiobook={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
