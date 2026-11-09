'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { adminApi, type AdminBook, type BookInput, type ProductStatus } from '@/lib/admin-api';
import { Button, buttonClasses } from '../ui/button';
import { ImageUpload } from './image-upload';
import { Field, inputClass, Notice, StatusBadge } from './ui';

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d+$/.test(value) && +value >= min && +value <= max));

const schema = z.object({
  title: z.string().trim().min(1).max(255),
  author: z.string().trim().min(1).max(255),
  description: z.string().max(10_000),
  price: z
    .string()
    .trim()
    .refine(
      (value) => /^\d+([.,]\d{1,2})?$/.test(value) && parseFloat(value.replace(',', '.')) > 0,
    ),
  stockQuantity: optionalInt(0, 1_000_000),
  language: z.enum(['', 'ky', 'ru', 'en']),
  isbn: z.string().trim().max(20),
  publisher: z.string().trim().max(255),
  publicationYear: optionalInt(1000, 2100),
  pages: optionalInt(1, 20_000),
  categoryIds: z.array(z.string()),
  coverKey: z.string().nullable(),
});
type FormValues = z.infer<typeof schema>;

const toNumber = (value: string) => (value === '' ? null : Number(value));

function toInput(values: FormValues): BookInput {
  return {
    title: values.title,
    author: values.author,
    description: values.description.trim() || null,
    price: Math.round(parseFloat(values.price.replace(',', '.')) * 100),
    stockQuantity: Number(values.stockQuantity || 0),
    language: values.language || null,
    isbn: values.isbn || null,
    publisher: values.publisher || null,
    publicationYear: toNumber(values.publicationYear),
    pages: toNumber(values.pages),
    categoryIds: values.categoryIds,
    coverKey: values.coverKey,
  };
}

function fromBook(book?: AdminBook): FormValues {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    description: book?.description ?? '',
    price: book ? String(book.price / 100) : '',
    stockQuantity: book ? String(book.stockQuantity) : '1',
    language: book?.language ?? '',
    isbn: book?.isbn ?? '',
    publisher: book?.publisher ?? '',
    publicationYear: book?.publicationYear ? String(book.publicationYear) : '',
    pages: book?.pages ? String(book.pages) : '',
    categoryIds: book?.categories.map((category) => category.id) ?? [],
    coverKey: book?.coverKey ?? null,
  };
}

export function BookForm({
  book,
  justCreated = false,
}: {
  book?: AdminBook;
  justCreated?: boolean;
}) {
  const t = useTranslations('admin.books');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    justCreated ? { tone: 'success', text: t('created') } : null,
  );
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const { register, handleSubmit, control, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: fromBook(book),
  });

  const describe = (caught: unknown) =>
    caught instanceof ApiRequestError && caught.status === 409 ? t('slugTaken') : tc('error');

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      book ? adminApi.updateBook(book.id, toInput(values)) : adminApi.createBook(toInput(values)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      if (!book) {
        router.replace(`/admin/books/${saved.id}?created=1`);
        return;
      }
      queryClient.setQueryData(['admin', 'book', saved.id], saved);
      reset(fromBook(saved));
      setNotice({ tone: 'success', text: tc('saved') });
    },
    onError: (caught) => setNotice({ tone: 'error', text: describe(caught) }),
  });

  const setStatus = useMutation({
    mutationFn: (status: ProductStatus) => adminApi.setBookStatus(book!.id, status),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'book', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      const key =
        saved.status === 'ACTIVE'
          ? 'published'
          : saved.status === 'ARCHIVED'
            ? 'archived'
            : 'drafted';
      setNotice({ tone: 'success', text: t(key) });
    },
    onError: () => setNotice({ tone: 'error', text: tc('error') }),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.deleteBook(book!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      router.replace('/admin/books');
    },
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 409
            ? t('cannotDelete')
            : tc('error'),
      }),
  });

  const images = useMutation({
    mutationFn: async (action: { add: string } | { remove: string }) => {
      if ('add' in action) await adminApi.addBookImage(book!.id, action.add);
      else await adminApi.removeBookImage(book!.id, action.remove);
      return adminApi.book(book!.id);
    },
    onSuccess: (saved) => queryClient.setQueryData(['admin', 'book', saved.id], saved),
    onError: () => setNotice({ tone: 'error', text: tc('error') }),
  });

  const err = (name: keyof FormValues, message: string) =>
    formState.errors[name] ? message : undefined;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        setNotice(null);
        save.mutate(values);
      })}
      className="grid gap-6 lg:grid-cols-[16rem_1fr]"
    >
      <div className="space-y-4">
        <Controller
          control={control}
          name="coverKey"
          render={({ field }) => (
            <ImageUpload
              kind="book-cover"
              label={t('cover')}
              url={book?.coverUrl ?? null}
              onChange={field.onChange}
            />
          )}
        />
        {book && (
          <div className="card space-y-3 p-4">
            <StatusBadge status={book.status} />
            <div className="flex flex-col gap-2">
              {book.status !== 'ACTIVE' && (
                <Button onClick={() => setStatus.mutate('ACTIVE')} disabled={setStatus.isPending}>
                  {t('publish')}
                </Button>
              )}
              {book.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  onClick={() => setStatus.mutate('ARCHIVED')}
                  disabled={setStatus.isPending}
                >
                  {t('archive')}
                </Button>
              )}
              {book.status === 'ARCHIVED' && (
                <Button
                  variant="ghost"
                  onClick={() => setStatus.mutate('DRAFT')}
                  disabled={setStatus.isPending}
                >
                  {t('toDraft')}
                </Button>
              )}
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[#8a3524] underline"
                onClick={() => {
                  if (window.confirm(t('confirmDelete', { title: book.title }))) remove.mutate();
                }}
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
            error={err('title', t('required'))}
            className="sm:col-span-2"
          >
            <input
              {...register('title')}
              aria-invalid={Boolean(formState.errors.title)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t('fields.author')}
            error={err('author', t('required'))}
            className="sm:col-span-2"
          >
            <input
              {...register('author')}
              aria-invalid={Boolean(formState.errors.author)}
              className={inputClass}
            />
          </Field>
          <Field label={t('fields.price')} error={err('price', t('pricePositive'))}>
            <input
              {...register('price')}
              inputMode="decimal"
              placeholder="650"
              aria-invalid={Boolean(formState.errors.price)}
              className={inputClass}
            />
          </Field>
          <Field label={t('fields.stock')} error={err('stockQuantity', t('numberInvalid'))}>
            <input
              {...register('stockQuantity')}
              inputMode="numeric"
              aria-invalid={Boolean(formState.errors.stockQuantity)}
              className={inputClass}
            />
          </Field>
          <Field label={t('fields.language')}>
            <select {...register('language')} className={inputClass}>
              <option value="">{t('noLanguage')}</option>
              <option value="ky">{t('languages.ky')}</option>
              <option value="ru">{t('languages.ru')}</option>
              <option value="en">{t('languages.en')}</option>
            </select>
          </Field>
          <Field label={t('fields.isbn')} error={err('isbn', t('isbnInvalid'))}>
            <input {...register('isbn')} className={inputClass} />
          </Field>
          <Field label={t('fields.publisher')}>
            <input {...register('publisher')} className={inputClass} />
          </Field>
          <Field label={t('fields.year')} error={err('publicationYear', t('yearInvalid'))}>
            <input
              {...register('publicationYear')}
              inputMode="numeric"
              aria-invalid={Boolean(formState.errors.publicationYear)}
              className={inputClass}
            />
          </Field>
          <Field label={t('fields.pages')} error={err('pages', t('numberInvalid'))}>
            <input
              {...register('pages')}
              inputMode="numeric"
              aria-invalid={Boolean(formState.errors.pages)}
              className={inputClass}
            />
          </Field>
          <Field label={t('fields.description')} className="sm:col-span-2">
            <textarea {...register('description')} rows={6} className={inputClass} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-ink/85">{t('fields.categories')}</legend>
            {categories.data?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.data.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-sand bg-white/70 px-3 py-1.5 text-sm has-[:checked]:border-cocoa has-[:checked]:bg-cocoa has-[:checked]:text-milk"
                  >
                    <input
                      type="checkbox"
                      value={category.id}
                      {...register('categoryIds')}
                      className="sr-only"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {categories.isLoading ? (
                  tc('loading')
                ) : (
                  <Link href="/admin/categories" className="underline">
                    {t('noCategories')}
                  </Link>
                )}
              </p>
            )}
          </fieldset>
        </div>

        {book && (
          <div className="card p-5 sm:p-6">
            <h2 className="text-lg font-medium text-cocoa">{t('images')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {book.images.map((image) => (
                <div key={image.id} className="relative">
                  {image.url && (
                    <img
                      src={image.url}
                      alt=""
                      className="aspect-square w-full rounded-2xl object-cover"
                    />
                  )}
                  <button
                    type="button"
                    className="absolute top-2 right-2 rounded-full bg-milk/90 px-2 py-1 text-xs font-semibold text-[#8a3524] shadow"
                    onClick={() => images.mutate({ remove: image.id })}
                  >
                    {tc('delete')}
                  </button>
                </div>
              ))}
              <ImageUpload
                key={book.images.length}
                kind="book-image"
                label={t('addImage')}
                url={null}
                aspect="aspect-square"
                removable={false}
                onChange={(key) => key && images.mutate({ add: key })}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? tc('saving') : tc('save')}
          </Button>
          <Link href="/admin/books" className={buttonClasses('outline')}>
            {tc('back')}
          </Link>
        </div>
      </div>
    </form>
  );
}
