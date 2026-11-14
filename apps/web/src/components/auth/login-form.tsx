'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { login, safeNext } from '@/lib/auth';
import { Button } from '../ui/button';
import { FormAlert } from './auth-card';
import { GoogleButton, OrDivider } from './google-button';
import { PasswordInput, textInputClass } from './password-input';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

const GOOGLE_ERRORS = [
  'google_cancelled',
  'google_failed',
  'google_blocked',
  'google_unavailable',
] as const;

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const googleError = GOOGLE_ERRORS.find((code) => code === params.get('error'));
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

  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

  return (
    <div className="mt-8">
      {googleError && (
        <div className="mb-5">
          <FormAlert tone={googleError === 'google_cancelled' ? 'info' : 'error'}>
            {t(`googleErrors.${googleError}`)}
          </FormAlert>
        </div>
      )}
      <GoogleButton next={next} label="google" />
      <OrDivider />
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <label className="block text-sm font-medium text-ink/85">
          {t('email')}
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(formState.errors.email)}
            {...register('email')}
            className={textInputClass}
          />
          {formState.errors.email && (
            <span className="mt-1 block text-xs text-[#a3412c]">{t('emailInvalid')}</span>
          )}
        </label>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-medium text-ink/85">
              {t('password')}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-cocoa underline-offset-2 hover:underline"
            >
              {t('forgot')}
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            aria-invalid={Boolean(formState.errors.password)}
            {...register('password')}
          />
          {formState.errors.password && (
            <span className="mt-1 block text-xs text-[#a3412c]">{t('passwordRequired')}</span>
          )}
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {notAdmin && (
          <FormAlert tone="info">
            {t('notAdmin')}{' '}
            <Link href="/" className="font-semibold underline">
              {t('toSite')}
            </Link>
          </FormAlert>
        )}
        <Button type="submit" disabled={formState.isSubmitting} className="w-full">
          {formState.isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/70">
        {t('noAccount')}{' '}
        <Link href={withNext('/register')} className="font-semibold text-cocoa underline">
          {t('toRegister')}
        </Link>
      </p>
    </div>
  );
}
