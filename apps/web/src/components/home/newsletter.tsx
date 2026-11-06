'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { CornerOrnament } from '../ornaments/ornaments';
import { Button } from '../ui/button';

const schema = z.object({ email: z.string().trim().email() });
type FormValues = z.infer<typeof schema>;

/** Подписка на новости (ТЗ 2.4, п. 9) — POST /newsletter/subscribe. */
export function Newsletter() {
  const t = useTranslations('newsletter');
  const ts = useTranslations('sections');
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const subscribe = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<void>('/newsletter/subscribe', { method: 'POST', body: JSON.stringify(values) }),
  });

  return (
    <section className="container-page mt-20" aria-labelledby="newsletter-title">
      <div className="relative overflow-hidden rounded-3xl bg-forest px-6 py-10 text-milk sm:px-12">
        <CornerOrnament className="pointer-events-none absolute -right-12 -bottom-16 size-36 text-gold/25" />
        <div className="relative grid items-center gap-6 md:grid-cols-2">
          <div>
            <h2 id="newsletter-title" className="text-3xl font-semibold text-milk">
              {ts('newsletter')}
            </h2>
            <p className="mt-2 text-sm text-milk/75">{t('text')}</p>
          </div>
          {subscribe.isSuccess ? (
            <p
              role="status"
              className="rounded-2xl bg-milk/10 p-4 text-sm"
              data-testid="newsletter-success"
            >
              {t('success')}
            </p>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit((values) => subscribe.mutate(values))}
              className="flex flex-col gap-2"
            >
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
                  className="flex-1 rounded-full border border-milk/20 bg-milk px-5 py-3 text-sm text-ink placeholder:text-muted"
                />
                <Button
                  type="submit"
                  disabled={subscribe.isPending}
                  className="bg-gold text-forest hover:bg-gold-light"
                >
                  {t('submit')}
                </Button>
              </div>
              {formState.errors.email && <p className="text-xs text-gold-light">{t('invalid')}</p>}
              {subscribe.isError && <p className="text-xs text-gold-light">{t('error')}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
