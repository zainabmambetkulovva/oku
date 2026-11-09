'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadFile, type UploadKind } from '@/lib/admin-api';

interface ImageUploadProps {
  kind: UploadKind;
  /** Текущая картинка (адрес с сервера) */
  url: string | null;
  label: string;
  /** Вызывается с ключом загруженного файла; null — картинку убрали */
  onChange: (key: string | null) => void;
  aspect?: string;
  /** Без кнопки «Убрать» — например, для доп. фото, которые удаляются отдельно */
  removable?: boolean;
}

/**
 * Загрузка картинки: выбрать файл или перетащить, проверка типа и размера,
 * предпросмотр сразу, полоска прогресса, понятные ошибки.
 */
export function ImageUpload({
  kind,
  url,
  label,
  onChange,
  aspect = 'aspect-[2/3]',
  removable = true,
}: ImageUploadProps) {
  const t = useTranslations('admin.upload');
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => setPreview(url), [url]);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError(t('type'));
    if (file.size > MAX_IMAGE_BYTES) return setError(t('size'));

    const local = URL.createObjectURL(file);
    setPreview(local);
    setProgress(0);
    try {
      const key = await uploadFile(kind, file, setProgress);
      onChange(key);
    } catch (caught) {
      setPreview(url);
      setError(
        caught instanceof ApiRequestError && caught.status === 503 ? t('storage') : t('failed'),
      );
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const uploading = progress !== null;

  return (
    <div>
      <span className="block text-sm font-medium text-ink/85">{label}</span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handle(event.dataTransfer.files[0]);
        }}
        className={`relative mt-1.5 grid ${aspect} w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition ${dragging ? 'border-gold bg-gold/10' : 'border-sand bg-white/50'}`}
      >
        {preview ? (
          // Предпросмотр (локальный файл или адрес из хранилища)
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-1 p-4 text-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-8 text-gold"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden="true"
            >
              <path
                d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold text-cocoa">{t('choose')}</span>
            <span className="text-xs text-muted">{t('drop')}</span>
            <span className="text-[0.7rem] text-muted">{t('hint')}</span>
          </label>
        )}
        {uploading && (
          <div
            className="absolute inset-x-0 bottom-0 bg-cocoa/80 p-2 text-center text-xs text-milk"
            role="status"
          >
            {t('uploading', { percent: progress })}
            <div className="mt-1 h-1 rounded-full bg-milk/30">
              <div
                className="h-1 rounded-full bg-gold transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-label={label}
        onChange={(event) => void handle(event.target.files?.[0])}
        disabled={uploading}
      />
      {preview && !uploading && (
        <div className="mt-2 flex gap-3 text-xs font-semibold">
          <label htmlFor={inputId} className="cursor-pointer text-cocoa underline">
            {t('replace')}
          </label>
          {removable && (
            <button
              type="button"
              className="text-[#8a3524] underline"
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
            >
              {t('remove')}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#a3412c]">
          {error}
        </p>
      )}
    </div>
  );
}
