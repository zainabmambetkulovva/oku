'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { formatClock } from '@/lib/format';
import type { AudiobookDetails, StreamLink } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { BackIcon, ForwardIcon, LockIcon, PauseIcon, PlayIcon, VolumeIcon } from '../ui/icons';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/**
 * Интерактивный аудиоплеер главной (ТЗ 2.4, п. 7; ТЗ 9.1): главы, перемотка,
 * скорость, громкость. Файл главы — по временной ссылке от API после проверки доступа.
 */
export function AudioPlayer({ audiobook }: { audiobook: AudiobookDetails }) {
  const t = useTranslations('player');
  const audio = useRef<HTMLAudioElement>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.9);
  const [message, setMessage] = useState<string | null>(null);

  const stream = useMutation({
    mutationFn: (id: string) =>
      apiFetch<StreamLink>(
        `/audiobooks/${encodeURIComponent(audiobook.slug)}/chapters/${id}/stream`,
      ),
  });

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  const firstFree = audiobook.chapters.find((chapter) => chapter.isFreePreview);
  const current = audiobook.chapters.find((chapter) => chapter.id === chapterId);

  async function playChapter(id: string) {
    setMessage(null);
    if (id === chapterId && audio.current?.src) {
      return audio.current.paused ? audio.current.play() : audio.current.pause();
    }
    try {
      const link = await stream.mutateAsync(id);
      setChapterId(id);
      setTime(0);
      if (audio.current) {
        audio.current.src = link.url;
        audio.current.playbackRate = speed;
        await audio.current.play();
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) setMessage(t('signIn'));
      else if (error instanceof ApiRequestError && error.status === 403) setMessage(t('purchase'));
      else setMessage(t('error'));
    }
  }

  const seek = (seconds: number) => {
    if (audio.current) audio.current.currentTime = Math.max(0, Math.min(duration || 0, seconds));
  };

  return (
    <div
      className="card grid gap-6 overflow-hidden p-5 sm:p-8 lg:grid-cols-[minmax(0,15rem)_1fr]"
      data-testid="audio-player"
    >
      <div className="mx-auto w-40 sm:w-48 lg:w-full">
        <BookCover
          slug={audiobook.slug}
          title={audiobook.title}
          author={audiobook.author}
          coverUrl={audiobook.coverUrl}
          square
        />
      </div>

      <div className="min-w-0">
        <h3 className="text-2xl font-semibold">{audiobook.title}</h3>
        <p className="mt-1 text-sm text-muted">
          {audiobook.author}
          {audiobook.narrator && <> · {t('narrator', { name: audiobook.narrator })}</>}
        </p>

        <audio
          ref={audio}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onError={() => audio.current?.src && setMessage(t('error'))}
        />

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => seek(time - 15)}
            disabled={!current}
            aria-label={t('back')}
            className="grid size-10 place-items-center rounded-full text-forest hover:bg-forest-100 disabled:opacity-40"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={() => playChapter(chapterId ?? firstFree?.id ?? audiobook.chapters[0]?.id)}
            disabled={stream.isPending || audiobook.chapters.length === 0}
            aria-label={playing ? t('pause') : t('play')}
            className="grid size-14 place-items-center rounded-full bg-forest text-milk shadow-lg transition hover:bg-forest-700 disabled:opacity-60"
            data-testid="player-toggle"
          >
            {playing ? (
              <PauseIcon className="size-6" />
            ) : (
              <PlayIcon className="size-6 translate-x-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => seek(time + 15)}
            disabled={!current}
            aria-label={t('forward')}
            className="grid size-10 place-items-center rounded-full text-forest hover:bg-forest-100 disabled:opacity-40"
          >
            <ForwardIcon />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="player-speed">
              {t('speed')}
            </label>
            <select
              id="player-speed"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="rounded-full border border-sand bg-milk px-3 py-1.5 text-xs font-semibold text-forest"
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
            <VolumeIcon className="hidden size-5 text-forest sm:block" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label={t('volume')}
              className="hidden w-20 accent-forest sm:block"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted tabular-nums">
          <span>{formatClock(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || current?.durationSeconds || 0}
            step={1}
            value={time}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!current}
            aria-label={t('seek')}
            className="flex-1 accent-forest"
          />
          <span>{formatClock(duration || current?.durationSeconds || 0)}</span>
        </div>

        {message && (
          <p role="status" className="mt-3 rounded-xl bg-gold-light/40 px-4 py-2 text-sm text-ink">
            {message}
          </p>
        )}

        <h4 className="mt-6 mb-2 font-sans text-sm font-bold text-ink">{t('chapters')}</h4>
        <ol className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {audiobook.chapters.map((chapter) => {
            const active = chapter.id === chapterId;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => playChapter(chapter.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${active ? 'bg-forest text-milk' : 'hover:bg-cream'}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="w-6 text-xs opacity-70 tabular-nums">
                    {chapter.chapterNumber}
                  </span>
                  <span className="flex-1 truncate">{chapter.title}</span>
                  <span className={`text-xs ${active ? 'text-milk/80' : 'text-muted'}`}>
                    {formatClock(chapter.durationSeconds)}
                  </span>
                  {chapter.isFreePreview ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${active ? 'bg-milk/20' : 'bg-forest-100 text-forest'}`}
                    >
                      {t('free')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[0.65rem]" title={t('locked')}>
                      <LockIcon className="size-3.5" />
                      <span className="sr-only">{t('locked')}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
