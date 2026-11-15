'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { authFetch, refreshSession, useAuth } from '@/lib/auth';
import { formatClock } from '@/lib/format';
import type { AudiobookDetails, StreamLink } from '@/lib/types';
import { BookCover } from '../catalog/book-cover';
import { BackIcon, ForwardIcon, LockIcon, PauseIcon, PlayIcon, VolumeIcon } from '../ui/icons';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
/** Как часто сохранять место прослушивания во время игры, мс. */
const SAVE_EVERY_MS = 15_000;

interface AccessInfo {
  hasFullAccess: boolean;
  availableChapterIds: string[];
}

interface Progress {
  chapterId: string | null;
  positionSeconds: number;
  completed: boolean;
}

/**
 * Аудиоплеер: главы, перемотка, скорость, громкость. Файл главы — по временной
 * ссылке от API после проверки доступа. Вошедшему покупателю доступны все главы,
 * место прослушивания сохраняется в аккаунте и продолжается на любом устройстве.
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
  const status = useAuth((state) => state.status);
  const signedIn = status === 'authenticated';
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  /** Куда перемотать после загрузки главы (продолжение с места остановки) */
  const resumeAt = useRef<number | null>(null);
  const lastSaved = useRef(0);
  const base = `/audiobooks/${encodeURIComponent(audiobook.slug)}`;

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  // Какие главы доступны и где покупатель остановился в прошлый раз
  useEffect(() => {
    if (status === 'unknown') return;
    const load = signedIn ? authFetch : apiFetch;
    load<AccessInfo>(`${base}/access`)
      .then(setAccess)
      .catch(() => setAccess(null));
    if (signedIn) {
      authFetch<Progress | null>(`${base}/progress`)
        .then((saved) => setProgress(saved ?? null))
        .catch(() => setProgress(null));
    } else {
      setProgress(null);
    }
  }, [status, signedIn, base]);

  const available = (id: string) =>
    access
      ? access.availableChapterIds.includes(id)
      : Boolean(audiobook.chapters.find((chapter) => chapter.id === id)?.isFreePreview);

  const stream = useMutation({
    mutationFn: (id: string) =>
      (signedIn ? authFetch : apiFetch)<StreamLink>(`${base}/chapters/${id}/stream`),
  });

  /** Сохранить место прослушивания (только вошедшему и только в доступной главе). */
  const save = useCallback(
    (completed = false) => {
      const element = audio.current;
      const chapter = audiobook.chapters.find((item) => item.id === chapterId);
      if (!signedIn || !element || !chapter || !available(chapter.id)) return;
      lastSaved.current = Date.now();
      const positionSeconds = Math.min(Math.floor(element.currentTime), chapter.durationSeconds);
      const next = { chapterId: chapter.id, positionSeconds, completed };
      setProgress(next);
      void authFetch(`${base}/progress`, { method: 'PUT', body: JSON.stringify(next) }).catch(
        () => undefined,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signedIn, chapterId, base, audiobook.chapters, access],
  );

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  const firstFree = audiobook.chapters.find((chapter) => chapter.isFreePreview);
  const current = audiobook.chapters.find((chapter) => chapter.id === chapterId);

  async function playChapter(id: string, from?: number) {
    setMessage(null);
    if (id === chapterId && audio.current?.src) {
      return audio.current.paused ? audio.current.play() : audio.current.pause();
    }
    if (audio.current?.src && chapterId) save();
    try {
      const link = await stream.mutateAsync(id);
      setChapterId(id);
      setTime(from ?? 0);
      resumeAt.current = from && from > 0 ? from : null;
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

  const nextChapter = () => {
    const index = audiobook.chapters.findIndex((chapter) => chapter.id === chapterId);
    return audiobook.chapters.slice(index + 1).find((chapter) => available(chapter.id));
  };

  const resumeChapter =
    progress?.chapterId && !progress.completed
      ? audiobook.chapters.find((chapter) => chapter.id === progress.chapterId)
      : undefined;
  const canResume = Boolean(resumeChapter && available(resumeChapter.id) && !chapterId);

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

        {access?.hasFullAccess && (
          <p
            className="mt-2 inline-block rounded-full bg-[#e3ecd5] px-3 py-1 text-xs font-semibold text-[#3f5a24]"
            data-testid="full-access"
          >
            {t('fullAccess')}
          </p>
        )}
        {canResume && resumeChapter && (
          <button
            type="button"
            onClick={() => void playChapter(resumeChapter.id, progress!.positionSeconds)}
            className="mt-3 block rounded-full border border-gold bg-white/70 px-4 py-2 text-sm font-semibold text-cocoa hover:bg-white"
            data-testid="player-resume"
          >
            {t('resume', {
              number: resumeChapter.chapterNumber,
              time: formatClock(progress!.positionSeconds),
            })}
          </button>
        )}

        <audio
          ref={audio}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            if (!audio.current?.ended) save();
          }}
          onEnded={() => {
            setPlaying(false);
            const next = nextChapter();
            if (next) {
              save();
              void playChapter(next.id);
            } else {
              save(true);
            }
          }}
          onTimeUpdate={(event) => {
            setTime(event.currentTarget.currentTime);
            if (Date.now() - lastSaved.current > SAVE_EVERY_MS && !event.currentTarget.paused) {
              save();
            }
          }}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration);
            if (resumeAt.current !== null) {
              event.currentTarget.currentTime = resumeAt.current;
              resumeAt.current = null;
            }
          }}
          onError={() => audio.current?.src && setMessage(t('error'))}
        />

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => seek(time - 15)}
            disabled={!current}
            aria-label={t('back')}
            className="grid size-10 place-items-center rounded-full text-cocoa hover:bg-cocoa-100 disabled:opacity-40"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={() => playChapter(chapterId ?? firstFree?.id ?? audiobook.chapters[0]?.id)}
            disabled={stream.isPending || audiobook.chapters.length === 0}
            aria-label={playing ? t('pause') : t('play')}
            className="grid size-14 place-items-center rounded-full bg-cocoa text-milk shadow-lg transition hover:bg-cocoa-700 disabled:opacity-60"
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
            className="grid size-10 place-items-center rounded-full text-cocoa hover:bg-cocoa-100 disabled:opacity-40"
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
              className="rounded-full border border-sand bg-milk px-3 py-1.5 text-xs font-semibold text-cocoa"
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
            <VolumeIcon className="hidden size-5 text-cocoa sm:block" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label={t('volume')}
              className="hidden w-20 accent-cocoa sm:block"
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
            className="flex-1 accent-cocoa"
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${active ? 'bg-cocoa text-milk' : 'hover:bg-cream'}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="w-6 text-xs opacity-70 tabular-nums">
                    {chapter.chapterNumber}
                  </span>
                  <span className="flex-1 truncate">{chapter.title}</span>
                  <span className={`text-xs ${active ? 'text-milk/80' : 'text-muted'}`}>
                    {formatClock(chapter.durationSeconds)}
                  </span>
                  {chapter.isFreePreview && !access?.hasFullAccess ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${active ? 'bg-milk/20' : 'bg-cocoa-100 text-cocoa'}`}
                    >
                      {t('free')}
                    </span>
                  ) : available(chapter.id) ? null : (
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
