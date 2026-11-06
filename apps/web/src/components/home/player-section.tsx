import { getTranslations } from 'next-intl/server';
import type { AudiobookDetails } from '@/lib/types';
import { SectionTitle } from '../ui/section-title';
import { AudioPlayer } from './audio-player';

export async function PlayerSection({ audiobook }: { audiobook: AudiobookDetails | null }) {
  const t = await getTranslations('player');
  const ts = await getTranslations('sections');
  return (
    <section
      id="player"
      className="container-page mt-16 scroll-mt-24"
      aria-labelledby="player-title"
    >
      <SectionTitle id="player-title">{ts('player')}</SectionTitle>
      <p className="-mt-3 mb-6 text-center text-sm text-muted">{t('subtitle')}</p>
      {audiobook ? (
        <AudioPlayer audiobook={audiobook} />
      ) : (
        <p className="card p-8 text-center text-muted">{t('noAudiobooks')}</p>
      )}
    </section>
  );
}
