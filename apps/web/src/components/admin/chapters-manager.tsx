'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import {
  adminApi,
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  type AdminAudiobook,
  uploadFile,
} from '@/lib/admin-api';
import { formatClock } from '@/lib/format';
import { Button } from '../ui/button';
import { inputClass, Notice } from './ui';

/** Длительность аудиофайла по метаданным (браузер читает только заголовок файла). */
export function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      Number.isFinite(audio.duration) && audio.duration > 0
        ? resolve(Math.max(1, Math.round(audio.duration)))
        : reject(new Error('no duration'));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    audio.src = url;
  });
}

/** Главы: загрузка аудио, название, бесплатность, порядок, удаление. */
export function ChaptersManager({ audiobook }: { audiobook: AdminAudiobook }) {
  const t = useTranslations('admin.audiobooksAdmin');
  const tc = useTranslations('admin.common');
  const tu = useTranslations('admin.upload');
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [free, setFree] = useState(audiobook.chapters.length === 0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chapters = [...audiobook.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const reload = async () => {
    client.setQueryData(
      ['admin', 'audiobook', audiobook.id],
      await adminApi.audiobook(audiobook.id),
    );
    void client.invalidateQueries({ queryKey: ['admin', 'audiobooks'] });
  };

  const change = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => {
      await action();
      await reload();
    },
    onError: () => setError(tc('error')),
  });

  const upload = async () => {
    if (!file || !title.trim()) return setError(tc('error'));
    setError(null);
    let duration: number;
    try {
      duration = await audioDuration(file);
    } catch {
      return setError(t('audioDuration'));
    }
    setProgress(0);
    try {
      const key = await uploadFile('audio-chapter', file, setProgress);
      await adminApi.addChapter(audiobook.id, {
        title: title.trim(),
        durationSeconds: duration,
        storageKey: key,
        isFreePreview: free,
      });
      await reload();
      setFile(null);
      setTitle('');
      setFree(false);
      if (input.current) input.current.value = '';
    } catch {
      setError(tu('failed'));
    } finally {
      setProgress(null);
    }
  };

  const move = (index: number, delta: number) => {
    const order = chapters.map((chapter) => chapter.id);
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    change.mutate(() => adminApi.reorderChapters(audiobook.id, order));
  };

  return (
    <section className="card space-y-4 p-5 sm:p-6" data-testid="chapters">
      <h2 className="text-lg font-medium text-cocoa">{t('chapters')}</h2>
      <p className="text-sm text-ink/70">{t('chaptersHint')}</p>
      {chapters.length === 0 && <p className="text-sm text-muted">{t('noChapters')}</p>}
      <ol className="space-y-2">
        {chapters.map((chapter, index) => (
          <li
            key={chapter.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/60 px-3 py-2 text-sm"
            data-testid="chapter"
          >
            <span className="w-6 text-xs text-muted">{chapter.chapterNumber}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{chapter.title}</span>
            <span className="text-xs text-muted">{formatClock(chapter.durationSeconds)}</span>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={chapter.isFreePreview}
                onChange={(event) =>
                  change.mutate(() =>
                    adminApi.updateChapter(audiobook.id, chapter.id, {
                      isFreePreview: event.target.checked,
                    }),
                  )
                }
                className="size-4 accent-[#3a2416]"
              />
              {t('free')}
            </label>
            <button
              type="button"
              className="text-xs underline disabled:opacity-30"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`${t('up')}: ${chapter.title}`}
            >
              ↑
            </button>
            <button
              type="button"
              className="text-xs underline disabled:opacity-30"
              disabled={index === chapters.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`${t('down')}: ${chapter.title}`}
            >
              ↓
            </button>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => {
                const next = window.prompt(t('rename'), chapter.title)?.trim();
                if (next && next !== chapter.title)
                  change.mutate(() =>
                    adminApi.updateChapter(audiobook.id, chapter.id, { title: next }),
                  );
              }}
            >
              {t('rename')}
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-[#8a3524] underline"
              onClick={() =>
                window.confirm(`${tc('delete')}: ${chapter.title}?`) &&
                change.mutate(() => adminApi.deleteChapter(audiobook.id, chapter.id))
              }
            >
              {tc('delete')}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 rounded-2xl border border-dashed border-sand p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-medium text-ink/85">
          {t('chapterTitle')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-ink/85">
          {t('audioFile')}
          <input
            ref={input}
            type="file"
            accept={AUDIO_TYPES.join(',')}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setError(null);
              if (chosen && !AUDIO_TYPES.includes(chosen.type)) return setError(t('audioType'));
              if (chosen && chosen.size > MAX_AUDIO_BYTES) return setError(t('audioSize'));
              setFile(chosen);
              if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ''));
            }}
            className="mt-1.5 block w-full text-sm"
          />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={free}
              onChange={(e) => setFree(e.target.checked)}
              className="size-4 accent-[#3a2416]"
            />
            {t('free')}
          </label>
          <Button onClick={() => void upload()} disabled={!file || progress !== null}>
            {progress !== null ? tu('uploading', { percent: progress }) : t('uploadChapter')}
          </Button>
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
