'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { register as registerAccount, safeNext } from '@/lib/auth';
import { Button } from '../ui/button';
import { FormAlert } from './auth-card';
import { GoogleButton, OrDivider } from './google-button';
import { PasswordInput, textInputClass } from './password-input';

/** Те же правила, что на сервере: не короче 8 символов, буква и цифра. */
export const strongPassword = z.string().min(8).max(72).regex(/\p{L}/u).regex(/\d/);

const schema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().email(),
  password: strongPassword,
  consent: z.literal(true),
});
type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const t = useTranslations('auth');
  const tr = useTranslations('auth.register');
  const locale = useLocale() as 'ru' | 'ky';
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [error, setError] = useState<'exists' | 'error' | 'locked' | null>(null);
  const [createdFor, setCreatedFor] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await registerAccount({
        email: values.email,
        password: values.password,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        locale,
      });
      setCreatedFor(user.email);
    } catch (caught) {
      const status = caught instanceof ApiRequestError ? caught.status : 0;
      setError(status === 409 ? 'exists' : status === 429 ? 'locked' : 'error');
    }
  });

  if (createdFor) {
    return (
      <div className="mt-8 space-y-5" data-testid="register-done">
        <h2 className="font-display text-2xl text-cocoa">{tr('doneTitle')}</h2>
        <FormAlert tone="success">{tr('doneText', { email: createdFor })}</FormAlert>
        <Button className="w-full" onClick={() => router.replace(next ?? '/')}>
          {tr('continue')}
        </Button>
      </div>
    );
  }

  const fieldError = (show: boolean, text: string) =>
    show ? <span className="mt-1 block text-xs text-[#a3412c]">{text}</span> : null;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="mt-8">
      <GoogleButton next={next} label="googleRegister" />
      <OrDivider />
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink/85">
            {tr('firstName')}
            <input
              autoComplete="given-name"
              {...register('firstName')}
              className={textInputClass}
            />
          </label>
          <label className="block text-sm font-medium text-ink/85">
            {tr('lastName')} <span className="font-normal text-muted">({tr('optional')})</span>
            <input
              autoComplete="family-name"
              {...register('lastName')}
              className={textInputClass}
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-ink/85">
          {t('email')}
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(formState.errors.email)}
            {...register('email')}
            className={textInputClass}
          />
          {fieldError(Boolean(formState.errors.email), t('emailInvalid'))}
        </label>
        <div>
          <label htmlFor="register-password" className="text-sm font-medium text-ink/85">
            {t('password')}
          </label>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            aria-invalid={Boolean(formState.errors.password)}
            aria-describedby="password-hint"
            {...register('password')}
          />
          <span id="password-hint" className="mt-1 block text-xs text-muted">
            {tr('passwordHint')}
          </span>
          {fieldError(Boolean(formState.errors.password), tr('passwordWeak'))}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink/80">
          <input
            type="checkbox"
            {...register('consent')}
            className="mt-0.5 size-4 accent-[#3a2416]"
          />
          <span>
            {tr.rich('consent', {
              terms: (chunks) => (
                <Link href="/terms" target="_blank" className="font-semibold underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" target="_blank" className="font-semibold underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {fieldError(Boolean(formState.errors.consent), tr('consentRequired'))}
        {error && (
          <FormAlert>
            {error === 'exists' ? tr('exists') : error === 'locked' ? t('locked') : t('error')}
          </FormAlert>
        )}
        <Button type="submit" disabled={formState.isSubmitting} className="w-full">
          {formState.isSubmitting ? tr('submitting') : tr('submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/70">
        {t('haveAccount')}{' '}
        <Link href={loginHref} className="font-semibold text-cocoa underline">
          {t('toLogin')}
        </Link>
      </p>
    </div>
  );
}
