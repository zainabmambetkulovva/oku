'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { Button } from '../ui/button';

const schema = z.object({ email: z.string().trim().email() });
type FormValues = z.infer<typeof schema>;

/**
 * Подписка на новинки (POST /newsletter/subscribe) — в тёмном подвале сайта.
 * Сообщения об успехе и ошибке озвучиваются экранным диктором.
 */
export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const subscribe = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<void>('/newsletter/subscribe', { method: 'POST', body: JSON.stringify(values) }),
  });

  if (subscribe.isSuccess) {
    return (
      <p
        role="status"
        className="rounded-2xl bg-milk/10 p-4 text-sm text-milk"
        data-testid="newsletter-success"
      >
        {t('success')}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => subscribe.mutate(values))}
      className="flex flex-col gap-2"
    >
      <p className="text-sm text-milk/70">{t('text')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t('placeholder')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={t('placeholder')}
          aria-invalid={Boolean(formState.errors.email)}
          {...register('email')}
          className="min-w-0 flex-1 rounded-full border border-milk/20 bg-milk/95 px-5 py-3 text-sm text-ink placeholder:text-muted"
        />
        <Button
          type="submit"
          disabled={subscribe.isPending}
          className="magnetic bg-gold text-cocoa-900 hover:bg-gold-light"
        >
          {t('submit')}
        </Button>
      </div>
      {formState.errors.email && <p className="text-xs text-gold-light">{t('invalid')}</p>}
      {subscribe.isError && (
        <p role="alert" className="text-xs text-gold-light">
          {t('error')}
        </p>
      )}
    </form>
  );
}
