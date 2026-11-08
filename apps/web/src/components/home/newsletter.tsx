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
    <section className="container-page mt-24" aria-labelledby="newsletter-title">
      <div className="card relative overflow-hidden px-6 py-10 sm:px-12">
        <CornerOrnament className="pointer-events-none absolute -right-12 -bottom-16 size-40 text-gold/30" />
        <div className="relative grid items-center gap-6 md:grid-cols-2">
          <div>
            <h2
              id="newsletter-title"
              className="text-[1.75rem] font-medium text-cocoa sm:text-[2.05rem]"
            >
              {ts('newsletter')}
            </h2>
            <p className="mt-2 text-sm text-ink/70">{t('text')}</p>
          </div>
          {subscribe.isSuccess ? (
            <p
              role="status"
              className="rounded-2xl bg-cocoa-100 p-4 text-sm text-cocoa"
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
                  className="flex-1 rounded-full border border-sand bg-white/80 px-5 py-3 text-sm text-ink placeholder:text-muted"
                />
                <Button type="submit" disabled={subscribe.isPending}>
                  {t('submit')}
                </Button>
              </div>
              {formState.errors.email && <p className="text-xs text-[#a3412c]">{t('invalid')}</p>}
              {subscribe.isError && <p className="text-xs text-[#a3412c]">{t('error')}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
