import { getTranslations } from 'next-intl/server';
import type { AudiobookDetails } from '@/lib/types';
import { SectionHeading } from '../ui/section-heading';
import { AudioPlayer } from './audio-player';

/** Интерактивный аудиоплеер (ТЗ 2.4, п. 7): бесплатные главы — всем. */
export async function PlayerSection({ audiobook }: { audiobook: AudiobookDetails | null }) {
  const t = await getTranslations('player');
  const ts = await getTranslations('sections');
  return (
    <section
      id="player"
      className="container-page mt-16 scroll-mt-24"
      aria-labelledby="player-title"
    >
      <SectionHeading id="player-title" title={ts('player')} subtitle={t('subtitle')} sparkle />
      {audiobook ? (
        <AudioPlayer audiobook={audiobook} />
      ) : (
        <p className="card p-8 text-center text-muted">{t('noAudiobooks')}</p>
      )}
    </section>
  );
}
