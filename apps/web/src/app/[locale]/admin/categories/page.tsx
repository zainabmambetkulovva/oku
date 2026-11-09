'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ImageUpload } from '@/components/admin/image-upload';
import { Field, inputClass, Notice, PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/lib/api';
import { adminApi, type AdminCategory } from '@/lib/admin-api';

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000),
  parentId: z.string(),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .refine((value) => /^\d{0,4}$/.test(value)),
  imageKey: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category: AdminCategory | null;
  categories: AdminCategory[];
  onDone: (message: string) => void;
}) {
  const t = useTranslations('admin.categories');
  const tc = useTranslations('admin.common');
  const tb = useTranslations('admin.books');
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId ?? '',
      isActive: category?.isActive ?? true,
      sortOrder: String(category?.sortOrder ?? 0),
      imageKey: undefined,
    },
  });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        name: values.name,
        description: values.description.trim() || null,
        parentId: values.parentId || null,
        isActive: values.isActive,
        sortOrder: Number(values.sortOrder || 0),
        // undefined — картинку не трогали
        ...(values.imageKey !== undefined && { imageKey: values.imageKey }),
      };
      return category
        ? adminApi.updateCategory(category.id, input)
        : adminApi.createCategory(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      onDone(tc('saved'));
    },
    onError: () => setError(tc('error')),
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => save.mutate(values))}
      className="card space-y-4 p-5"
    >
      <h2 className="text-lg font-medium text-cocoa">
        {category ? t('editTitle') : t('newTitle')}
      </h2>
      <Controller
        control={control}
        name="imageKey"
        render={({ field }) => (
          <ImageUpload
            kind="category-image"
            label={t('image')}
            url={category?.imageUrl ?? null}
            aspect="aspect-[4/3]"
            onChange={field.onChange}
          />
        )}
      />
      <Field label={t('name')} error={formState.errors.name ? tb('required') : undefined}>
        <input
          {...register('name')}
          aria-invalid={Boolean(formState.errors.name)}
          className={inputClass}
        />
      </Field>
      <Field label={t('description')}>
        <textarea {...register('description')} rows={3} className={inputClass} />
      </Field>
      <Field label={t('parent')}>
        <select {...register('parentId')} className={inputClass}>
          <option value="">{t('none')}</option>
          {categories
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </Field>
      <div className="flex items-end gap-4">
        <Field label={t('sortOrder')} className="w-28">
          <input {...register('sortOrder')} inputMode="numeric" className={inputClass} />
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="size-4 accent-[#3a2416]" />
          {t('active')}
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
        <Button variant="ghost" onClick={() => onDone('')}>
          {tc('cancel')}
        </Button>
      </div>
    </form>
  );
}

/** Категории: список с картинками и формой добавления/изменения. */
export default function CategoriesPage() {
  const t = useTranslations('admin.categories');
  const tc = useTranslations('admin.common');
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories });
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
    onError: (caught) =>
      setNotice({
        tone: 'error',
        text:
          caught instanceof ApiRequestError && caught.status === 409
            ? t('cannotDelete')
            : tc('error'),
      }),
  });

  const list = categories.data ?? [];

  return (
    <>
      <PageHeader
        title={t('title')}
        action={<Button onClick={() => setEditing('new')}>+ {t('add')}</Button>}
      />
      {notice && (
        <div className="mb-4">
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        {categories.isError ? (
          <p className="card p-8 text-center text-sm text-muted">{tc('error')}</p>
        ) : !categories.data ? (
          <p className="text-sm text-muted" role="status">
            {tc('loading')}
          </p>
        ) : list.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((category) => (
              <li key={category.id} className="card lift overflow-hidden">
                <div className="grid aspect-[4/3] place-items-center bg-gradient-to-b from-[#fcefe2] to-[#ebcfb4]">
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt="" className="size-full object-contain p-3" />
                  ) : (
                    <span className="text-xs text-muted">{t('image')}</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-ink">
                    {category.name}
                    {!category.isActive && (
                      <span className="ml-2 text-xs text-muted">({t('hidden')})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {t('products', { count: category.booksCount + category.audiobooksCount })}
                  </p>
                  <div className="mt-3 flex gap-4 text-xs font-semibold">
                    <button
                      type="button"
                      className="text-cocoa underline"
                      onClick={() => setEditing(category)}
                    >
                      {tc('edit')}
                    </button>
                    <button
                      type="button"
                      className="text-[#8a3524] underline"
                      onClick={() => {
                        setNotice(null);
                        if (window.confirm(t('confirmDelete', { name: category.name })))
                          remove.mutate(category.id);
                      }}
                    >
                      {tc('delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing.id}
            category={editing === 'new' ? null : editing}
            categories={list}
            onDone={(message) => {
              setEditing(null);
              setNotice(message ? { tone: 'success', text: message } : null);
            }}
          />
        )}
      </div>
    </>
  );
}
