import { getTranslations } from 'next-intl/server';
import type { AudiobookDetails } from '@/lib/types';
import { AudiobookShowcase } from '../community/audiobook-showcase';
import { SectionHeading } from '../ui/section-heading';

/** Витрина аудиокниг с плеером: бесплатные главы — всем, полные — после покупки. */
export async function PlayerSection({ audiobooks }: { audiobooks: AudiobookDetails[] }) {
  const t = await getTranslations('player');
  const ts = await getTranslations('sections');
  return (
    <section
      id="player"
      className="container-page mt-16 scroll-mt-24"
      aria-labelledby="player-title"
    >
      <SectionHeading id="player-title" title={ts('player')} subtitle={t('subtitle')} sparkle />
      {audiobooks.length > 0 ? (
        <AudiobookShowcase audiobooks={audiobooks} />
      ) : (
        <p className="card p-8 text-center text-muted">{t('noAudiobooks')}</p>
      )}
    </section>
  );
}

/** Полные данные аудиокниг (главы) для витрины: сначала те, у которых есть бесплатный фрагмент. */
export async function showcaseAudiobooks(
  list: { slug: string; hasFreePreview: boolean }[],
  load: (slug: string) => Promise<AudiobookDetails | null>,
  limit = 4,
) {
  const ordered = [...list].sort((a, b) => Number(b.hasFreePreview) - Number(a.hasFreePreview));
  const details = await Promise.all(ordered.slice(0, limit).map((item) => load(item.slug)));
  return details.filter((item): item is AudiobookDetails => item !== null);
}
