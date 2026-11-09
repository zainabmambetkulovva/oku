'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { login } from '@/lib/auth';
import { Button } from '../ui/button';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

/** Только относительные адреса внутри сайта — защита от перенаправления на чужой сайт. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [error, setError] = useState<string | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    setNotAdmin(false);
    try {
      const user = await login(email, password);
      if (next?.includes('/admin') && user.role !== 'ADMIN') {
        setNotAdmin(true);
        return;
      }
      router.replace(next ?? (user.role === 'ADMIN' ? '/admin' : '/'));
    } catch (caught) {
      const status = caught instanceof ApiRequestError ? caught.status : 0;
      setError(status === 401 ? t('invalid') : status === 429 ? t('locked') : t('error'));
    }
  });

  const input =
    'mt-1.5 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';

  return (
    <form noValidate onSubmit={onSubmit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium text-ink/85">
        {t('email')}
        <input
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(formState.errors.email)}
          {...register('email')}
          className={input}
        />
        {formState.errors.email && (
          <span className="mt-1 block text-xs text-[#a3412c]">{t('emailInvalid')}</span>
        )}
      </label>
      <label className="block text-sm font-medium text-ink/85">
        {t('password')}
        <input
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(formState.errors.password)}
          {...register('password')}
          className={input}
        />
        {formState.errors.password && (
          <span className="mt-1 block text-xs text-[#a3412c]">{t('passwordRequired')}</span>
        )}
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-[#a3412c]/10 px-4 py-3 text-sm text-[#8a3524]">
          {error}
        </p>
      )}
      {notAdmin && (
        <p role="alert" className="rounded-2xl bg-cocoa-100 px-4 py-3 text-sm text-cocoa">
          {t('notAdmin')}{' '}
          <Link href="/" className="font-semibold underline">
            {t('toSite')}
          </Link>
        </p>
      )}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        {formState.isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
