'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Field, inputClass, Notice, PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { adminApi, type AdminQuote, type QuoteInput } from '@/lib/admin-api';

const EMPTY: QuoteInput = { text: '', author: '', source: '', locale: 'ky', isActive: true };

function QuoteForm({
  quote,
  onDone,
}: {
  quote: AdminQuote | null;
  onDone: (message: string) => void;
}) {
  const t = useTranslations('admin.quotes');
  const tc = useTranslations('admin.common');
  const tl = useTranslations('catalog.languages');
  const client = useQueryClient();
  const [form, setForm] = useState<QuoteInput>(
    quote
      ? {
          text: quote.text,
          author: quote.author,
          source: quote.source ?? '',
          locale: quote.locale,
          isActive: quote.isActive,
        }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const input = {
        ...form,
        text: form.text.trim(),
        author: form.author.trim(),
        source: form.source?.trim() || undefined,
      };
      return quote ? adminApi.updateQuote(quote.id, input) : adminApi.createQuote(input);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'quotes'] });
      onDone(tc('saved'));
    },
    onError: () => setError(tc('error')),
  });

  return (
    <form
      noValidate
      className="card space-y-4 p-5"
      data-testid="quote-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (form.text.trim().length < 3 || !form.author.trim()) return setError(tc('error'));
        save.mutate();
      }}
    >
      <Field label={t('text')}>
        <textarea
          value={form.text}
          onChange={(event) => setForm({ ...form, text: event.target.value })}
          maxLength={600}
          rows={3}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('author')}>
          <input
            value={form.author}
            onChange={(event) => setForm({ ...form, author: event.target.value })}
            maxLength={150}
            className={inputClass}
          />
        </Field>
        <Field label={t('source')}>
          <input
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
            maxLength={200}
            className={inputClass}
          />
        </Field>
        <Field label={t('locale')}>
          <select
            value={form.locale}
            onChange={(event) => setForm({ ...form, locale: event.target.value as 'ru' | 'ky' })}
            className={inputClass}
          >
            <option value="ky">{tl('ky')}</option>
            <option value="ru">{tl('ru')}</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          className="size-4 accent-[#3a2416]"
        />
        {t('active')}
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? tc('saving') : tc('save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => onDone('')}>
          {tc('cancel')}
        </Button>
      </div>
    </form>
  );
}

/** Цитаты дня: добавление, правка, скрытие и удаление. */
export default function AdminQuotesPage() {
  const t = useTranslations('admin.quotes');
  const tc = useTranslations('admin.common');
  const tl = useTranslations('catalog.languages');
  const client = useQueryClient();
  const [editing, setEditing] = useState<AdminQuote | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'quotes'],
    queryFn: () => adminApi.quotes(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteQuote(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'quotes'] }),
  });

  const done = (text: string) => {
    setEditing(null);
    setMessage(text);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        action={editing === null && <Button onClick={() => setEditing('new')}>{t('add')}</Button>}
      />
      <p className="text-sm text-ink/70">{t('hint')}</p>
      {message && <Notice tone="success">{message}</Notice>}
      {editing === 'new' && <QuoteForm quote={null} onDone={done} />}
      {isLoading && <p className="text-sm text-muted">{tc('loading')}</p>}
      {isError && <Notice tone="error">{tc('error')}</Notice>}
      {data && data.data.length === 0 && editing !== 'new' && (
        <p className="card p-6 text-sm text-ink/75">{t('empty')}</p>
      )}
      <ul className="space-y-3">
        {data?.data.map((quote) =>
          editing !== 'new' && editing?.id === quote.id ? (
            <li key={quote.id}>
              <QuoteForm quote={quote} onDone={done} />
            </li>
          ) : (
            <li
              key={quote.id}
              className={`card p-5 ${quote.isActive ? '' : 'opacity-60'}`}
              data-testid="admin-quote"
            >
              <p className="font-display text-lg text-cocoa">«{quote.text}»</p>
              <p className="mt-1 text-sm text-ink/75">
                — {quote.author}
                {quote.source && `, ${quote.source}`} · {tl(quote.locale)}
                {!quote.isActive && (
                  <span className="ml-2 rounded-full bg-sand/60 px-2 py-0.5 text-xs">
                    {t('hidden')}
                  </span>
                )}
              </p>
              <div className="mt-3 flex gap-4 text-sm font-semibold">
                <button
                  type="button"
                  className="text-cocoa underline"
                  onClick={() => setEditing(quote)}
                >
                  {t('edit')}
                </button>
                <button
                  type="button"
                  className="text-[#8a3524] underline"
                  onClick={() => window.confirm(t('deleteConfirm')) && remove.mutate(quote.id)}
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
