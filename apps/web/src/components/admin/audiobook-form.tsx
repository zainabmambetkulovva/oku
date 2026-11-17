'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import {
  adminApi,
  type AdminAudiobook,
  type AudiobookInput,
  type ProductStatus,
} from '@/lib/admin-api';
import { formatClock } from '@/lib/format';
import { Button, buttonClasses } from '../ui/button';
import { AccessManager } from './access-manager';
import { ChaptersManager } from './chapters-manager';
import { ImageUpload } from './image-upload';
import { Field, inputClass, Notice, StatusBadge } from './ui';

interface Values {
  title: string;
  author: string;
  narrator: string;
  description: string;
  price: string;
  language: '' | 'ky' | 'ru' | 'en';
  categoryIds: string[];
  coverKey?: string | null;
}

const fromAudiobook = (audiobook?: AdminAudiobook): Values => ({
  title: audiobook?.title ?? '',
  author: audiobook?.author ?? '',
  narrator: audiobook?.narrator ?? '',
  description: audiobook?.description ?? '',
  price: audiobook ? String(audiobook.price / 100) : '',
  language: audiobook?.language ?? '',
  categoryIds: audiobook?.categories.map((category) => category.id) ?? [],
  coverKey: undefined,
});

const PRICE = /^\d+([.,]\d{1,2})?$/;

/** Аудиокнига: данные, обложка, публикация; главы и доступ — после создания. */
export function AudiobookForm({
  audiobook,
  justCreated = false,
}: {
  audiobook?: AdminAudiobook;
  justCreated?: boolean;
}) {
  const t = useTranslations('admin.audiobooksAdmin');
  const tb = useTranslations('admin.books');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const client = useQueryClient();
  const [values, setValues] = useState<Values>(fromAudiobook(audiobook));
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    justCreated ? { tone: 'success', text: t('created') } : null,
  );
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });

  const invalid = {
    title: !values.title.trim(),
    author: !values.author.trim(),
    price: !PRICE.test(values.price.trim()),
  };

  const input = (): AudiobookInput => ({
    title: values.title.trim(),
    author: values.author.trim(),
    narrator: values.narrator.trim() || null,
    description: values.description.trim() || null,
    price: Math.round(parseFloat(values.price.replace(',', '.')) * 100),
    language: values.language || null,
    categoryIds: values.categoryIds,
    ...(values.coverKey !== undefined && { coverKey: values.coverKey }),
  });

  const save = useMutation({
    mutationFn: () =>
      audiobook
        ? adminApi.updateAudiobook(audiobook.id, input())
        : adminApi.createAudiobook(input()),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ['admin', 'audiobooks'] });
      if (!audiobook) return router.replace(`/admin/audiobooks/${saved.id}?created=1`);
      client.setQueryData(['admin', 'audiobook', saved.id], saved);
      setNotice({ tone: 'success', text: tc('saved') });
    },
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 409
            ? tb('slugTaken')
            : tc('error'),
      }),
  });

  const setStatus = useMutation({
    mutationFn: (status: ProductStatus) => adminApi.setAudiobookStatus(audiobook!.id, status),
    onSuccess: (saved) => {
      client.setQueryData(['admin', 'audiobook', saved.id], saved);
      void client.invalidateQueries({ queryKey: ['admin', 'audiobooks'] });
      setNotice({
        tone: 'success',
        text: tb(
          saved.status === 'ACTIVE'
            ? 'published'
            : saved.status === 'ARCHIVED'
              ? 'archived'
              : 'drafted',
        ),
      });
    },
    onError: () =>
      setNotice({
        tone: 'error',
        text: audiobook?.chapters.length ? tc('error') : t('noChapters'),
      }),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.deleteAudiobook(audiobook!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'audiobooks'] });
      router.replace('/admin/audiobooks');
    },
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 409
            ? tb('cannotDelete')
            : tc('error'),
      }),
  });

  const field = (name: 'title' | 'author' | 'narrator' | 'price' | 'description') => ({
    value: values[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <div className="space-y-6">
      <form
        noValidate
        data-testid="audiobook-form"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          setNotice(null);
          if (Object.values(invalid).some(Boolean)) return;
          save.mutate();
        }}
        className="grid gap-6 lg:grid-cols-[16rem_1fr]"
      >
        <div className="space-y-4">
          <ImageUpload
            kind="audiobook-cover"
            label={t('cover')}
            url={audiobook?.coverUrl ?? null}
            aspect="aspect-square"
            onChange={(key) => setValues((current) => ({ ...current, coverKey: key }))}
          />
          {audiobook && (
            <div className="card space-y-3 p-4 text-sm">
              <StatusBadge status={audiobook.status} />
              <p className="text-xs text-muted">
                {t('duration', { time: formatClock(audiobook.durationSeconds) })} ·{' '}
                {t('sales', { count: audiobook.salesCount })}
              </p>
              <div className="flex flex-col gap-2">
                {audiobook.status !== 'ACTIVE' && (
                  <Button onClick={() => setStatus.mutate('ACTIVE')} disabled={setStatus.isPending}>
                    {tb('publish')}
                  </Button>
                )}
                {audiobook.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    onClick={() => setStatus.mutate('ARCHIVED')}
                    disabled={setStatus.isPending}
                  >
                    {tb('archive')}
                  </Button>
                )}
                {audiobook.status === 'ARCHIVED' && (
                  <Button
                    variant="ghost"
                    onClick={() => setStatus.mutate('DRAFT')}
                    disabled={setStatus.isPending}
                  >
                    {tb('toDraft')}
                  </Button>
                )}
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[#8a3524] underline"
                  onClick={() =>
                    window.confirm(tb('confirmDelete', { title: audiobook.title })) &&
                    remove.mutate()
                  }
                >
                  {tc('delete')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <div className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Field
              label={t('fields.title')}
              error={touched && invalid.title ? tb('required') : undefined}
              className="sm:col-span-2"
            >
              <input
                {...field('title')}
                aria-invalid={touched && invalid.title}
                className={inputClass}
              />
            </Field>
            <Field
              label={t('fields.author')}
              error={touched && invalid.author ? tb('required') : undefined}
            >
              <input
                {...field('author')}
                aria-invalid={touched && invalid.author}
                className={inputClass}
              />
            </Field>
            <Field label={t('fields.narrator')}>
              <input {...field('narrator')} className={inputClass} />
            </Field>
            <Field
              label={t('fields.price')}
              error={touched && invalid.price ? tb('pricePositive') : undefined}
            >
              <input
                {...field('price')}
                inputMode="decimal"
                placeholder="450"
                aria-invalid={touched && invalid.price}
                className={inputClass}
              />
            </Field>
            <Field label={t('fields.language')}>
              <select
                value={values.language}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    language: event.target.value as Values['language'],
                  }))
                }
                className={inputClass}
              >
                <option value="">{tb('noLanguage')}</option>
                <option value="ky">{tb('languages.ky')}</option>
                <option value="ru">{tb('languages.ru')}</option>
                <option value="en">{tb('languages.en')}</option>
              </select>
            </Field>
            <Field label={t('fields.description')} className="sm:col-span-2">
              <textarea {...field('description')} rows={5} className={inputClass} />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-ink/85">{t('fields.categories')}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.data?.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-sand bg-white/70 px-3 py-1.5 text-sm has-[:checked]:border-cocoa has-[:checked]:bg-cocoa has-[:checked]:text-milk"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={values.categoryIds.includes(category.id)}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          categoryIds: event.target.checked
                            ? [...current.categoryIds, category.id]
                            : current.categoryIds.filter((id) => id !== category.id),
                        }))
                      }
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? tc('saving') : tc('save')}
            </Button>
            <Link href="/admin/audiobooks" className={buttonClasses('outline')}>
              {tc('back')}
            </Link>
          </div>
        </div>
      </form>

      {audiobook && <ChaptersManager audiobook={audiobook} />}
      {audiobook && <AccessManager audiobookId={audiobook.id} />}
    </div>
  );
}
